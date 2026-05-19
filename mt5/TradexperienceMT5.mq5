//+------------------------------------------------------------------+
//|                                            TradexperienceMT5.mq5  |
//|                                  Tradexperience - Monitor unico   |
//|                                                                  |
//|  Somente leitura. Pode alimentar SIMULTANEAMENTE:                  |
//|   - Estrategia (payload completo)                                 |
//|   - Tesouraria (apenas equity utilizado pelo backend)             |
//|   - Live Portfolio (payload completo, endpoint dedicado)          |
//|  Cada destino tem seu proprio par (Enable + ApiKey + URL).        |
//|  Estados de backoff/auth sao independentes — falha em um nao      |
//|  bloqueia os outros. Nao abre, modifica ou fecha ordens.          |
//+------------------------------------------------------------------+
#property copyright "Tradexperience"
#property link      "https://tradexperience.com.br"
#property version   "1.0.0"
#property strict
#property description "Monitor unico (Estrategia + Tesouraria). Somente leitura."

//--- Inputs visiveis pro usuario ao anexar o EA
input bool   EnableStrategy  = true;   // Enviar telemetria de Estrategia
input string StrategyApiKey  = "";     // Chave da Estrategia (txp_live_...)
input bool   EnableTreasury  = false;  // Enviar telemetria de Tesouraria
input string TreasuryApiKey  = "";     // Chave da Tesouraria (txp_treas_...)
input bool   EnablePortfolio = false;  // Enviar telemetria de Live Portfolio
input string PortfolioApiKey = "";     // Chave do Portfolio (txp_port_...)

//--- Constantes internas (nao visiveis no dialogo do EA)
const string IngestUrlMain      = "https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/mt5-ingest";
const string IngestUrlPortfolio = "https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/portfolio-mt5-ingest";
const int    IntervalSec  = 300;   // Frequencia de envio (segundos)
const int    HeartbeatSec = 330;   // Heartbeat mesmo sem mudancas (segundos)
const bool   VerboseLog   = false;

//--- Constantes
#define EA_VERSION       "1.0.0"
#define HTTP_TIMEOUT_MS  5000
#define BACKOFF_MAX_SEC  60

//--- Estado por canal (Estrategia / Tesouraria / Portfolio) --------
struct ChannelState
{
   string   label;
   string   key;
   string   url;                // endpoint pra POST
   bool     enabled;
   bool     full_payload;       // true = payload completo (Estrategia/Portfolio); false = so equity (Tesouraria)
   bool     url_not_allowed;
   bool     auth_blocked;

   datetime last_send_ts;
   datetime next_retry_ts;
   int      backoff_sec;

   // snapshot pra detectar mudanca
   double   last_balance;
   double   last_equity;
   double   last_floating;
   double   last_daily;
   int      last_positions;
   datetime last_trade_at;
};

ChannelState g_strategy;
ChannelState g_treasury;
ChannelState g_portfolio;

//+------------------------------------------------------------------+
void InitChannel(ChannelState &ch, const string label, const string key,
                 const string url, bool enabled, bool full_payload)
{
   ch.label           = label;
   ch.key             = key;
   ch.url             = url;
   ch.enabled         = enabled;
   ch.full_payload    = full_payload;
   ch.url_not_allowed = false;
   ch.auth_blocked    = false;
   ch.last_send_ts    = 0;
   ch.next_retry_ts   = 0;
   ch.backoff_sec     = 0;
   ch.last_balance    = -1;
   ch.last_equity     = -1;
   ch.last_floating   = -1;
   ch.last_daily      = -1;
   ch.last_positions  = -1;
   ch.last_trade_at   = 0;
}

//+------------------------------------------------------------------+
int OnInit()
{
   InitChannel(g_strategy, "Estrategia", StrategyApiKey, IngestUrlMain,
               EnableStrategy && StringLen(StrategyApiKey) >= 10, true);
   InitChannel(g_treasury, "Tesouraria", TreasuryApiKey, IngestUrlMain,
               EnableTreasury && StringLen(TreasuryApiKey) >= 10, false);
   InitChannel(g_portfolio, "Portfolio", PortfolioApiKey, IngestUrlPortfolio,
               EnablePortfolio && StringLen(PortfolioApiKey) >= 10, true);

   if(!g_strategy.enabled && !g_treasury.enabled && !g_portfolio.enabled)
   {
      Comment("Tradexperience MT5: nenhum canal habilitado.\n"
              "Habilite Estrategia, Tesouraria e/ou Portfolio e cole as chaves.");
      Print("[Tradexperience] Nenhum canal habilitado. EA parado.");
      return(INIT_FAILED);
   }

   if(EnableStrategy && StringLen(StrategyApiKey) < 10)
      Print("[Tradexperience] Estrategia habilitada mas chave invalida — canal desativado.");
   if(EnableTreasury && StringLen(TreasuryApiKey) < 10)
      Print("[Tradexperience] Tesouraria habilitada mas chave invalida — canal desativado.");
   if(EnablePortfolio && StringLen(PortfolioApiKey) < 10)
      Print("[Tradexperience] Portfolio habilitado mas chave invalida — canal desativado.");

   EventSetTimer(IntervalSec);
   UpdateStatusComment("Iniciando...");
   Print("[Tradexperience] Iniciado. v", EA_VERSION,
         " | strategy=", g_strategy.enabled ? "on" : "off",
         " | treasury=", g_treasury.enabled ? "on" : "off",
         " | portfolio=", g_portfolio.enabled ? "on" : "off",
         " | conta=", AccountInfoInteger(ACCOUNT_LOGIN));

   // Primeiro envio imediato (depois o EventSetTimer cuida do ritmo de 300s).
   OnTimer();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
   Print("[Tradexperience] Finalizado. reason=", reason);
}

//+------------------------------------------------------------------+
void OnTimer()
{
   // Coleta o estado da conta uma vez por ciclo e reusa nos dois canais.
   double balance      = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
   double floating_pnl = 0.0;
   int    open_count   = 0;
   AggregateOpenPositions(floating_pnl, open_count);
   double   daily_pnl  = ComputeDailyPnL();
   datetime last_trade = ComputeLastTradeAt();

   if(g_strategy.enabled)
      ProcessChannel(g_strategy, balance, equity, floating_pnl, daily_pnl, open_count, last_trade);
   if(g_treasury.enabled)
      ProcessChannel(g_treasury, balance, equity, floating_pnl, daily_pnl, open_count, last_trade);
   if(g_portfolio.enabled)
      ProcessChannel(g_portfolio, balance, equity, floating_pnl, daily_pnl, open_count, last_trade);

   RefreshStatusComment(equity, floating_pnl, open_count);
}

//+------------------------------------------------------------------+
void ProcessChannel(ChannelState &ch,
                    double balance, double equity, double floating,
                    double daily, int positions, datetime last_trade)
{
   if(ch.auth_blocked || ch.url_not_allowed) return;
   if(TimeCurrent() < ch.next_retry_ts)      return;

   bool changed = HasChanged(ch, balance, equity, floating, daily, positions, last_trade);
   bool heartbeat_due = (TimeCurrent() - ch.last_send_ts) >= HeartbeatSec;
   if(!changed && !heartbeat_due) return;

   string json = BuildPayload(ch, balance, equity, floating, daily, positions, last_trade);
   if(SendPayload(ch, json))
   {
      ch.last_balance   = balance;
      ch.last_equity    = equity;
      ch.last_floating  = floating;
      ch.last_daily     = daily;
      ch.last_positions = positions;
      ch.last_trade_at  = last_trade;
      ch.last_send_ts   = TimeCurrent();
      ch.backoff_sec    = 0;
      ch.next_retry_ts  = 0;
   }
}

//+------------------------------------------------------------------+
bool HasChanged(const ChannelState &ch,
                double balance, double equity, double floating, double daily,
                int positions, datetime last_trade)
{
   // Modo tesouraria: backend so usa equity, entao so disparamos por equity.
   if(!ch.full_payload)
   {
      if(ch.last_equity < 0) return true;
      return MathAbs(equity - ch.last_equity) > 0.001;
   }

   if(ch.last_balance < 0) return true;
   if(MathAbs(balance  - ch.last_balance)  > 0.001) return true;
   if(MathAbs(equity   - ch.last_equity)   > 0.001) return true;
   if(MathAbs(floating - ch.last_floating) > 0.001) return true;
   if(MathAbs(daily    - ch.last_daily)    > 0.001) return true;
   if(positions != ch.last_positions)               return true;
   if(last_trade != ch.last_trade_at)               return true;
   return false;
}

//+------------------------------------------------------------------+
void AggregateOpenPositions(double &floating_out, int &count_out)
{
   floating_out = 0.0;
   count_out    = 0;
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      floating_out += PositionGetDouble(POSITION_PROFIT)
                    + PositionGetDouble(POSITION_SWAP);
      count_out++;
   }
}

//+------------------------------------------------------------------+
double ComputeDailyPnL()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   dt.hour = 0; dt.min = 0; dt.sec = 0;
   datetime day_start = StructToTime(dt);
   if(!HistorySelect(day_start, TimeCurrent())) return 0.0;

   double sum = 0.0;
   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      sum += HistoryDealGetDouble(ticket, DEAL_PROFIT)
           + HistoryDealGetDouble(ticket, DEAL_SWAP)
           + HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   }
   return sum;
}

//+------------------------------------------------------------------+
datetime ComputeLastTradeAt()
{
   datetime from = TimeCurrent() - 30 * 86400;
   if(!HistorySelect(from, TimeCurrent())) return 0;
   datetime last = 0;
   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      datetime t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      if(t > last) last = t;
   }
   return last;
}

//+------------------------------------------------------------------+
string BuildPayload(const ChannelState &ch,
                    double balance, double equity, double floating,
                    double daily, int positions, datetime last_trade)
{
   long   login     = AccountInfoInteger(ACCOUNT_LOGIN);
   string currency  = AccountInfoString(ACCOUNT_CURRENCY);
   string company   = AccountInfoString(ACCOUNT_COMPANY);
   string server    = AccountInfoString(ACCOUNT_SERVER);
   string term_hash = TerminalFingerprint();

   string last_trade_iso = (last_trade > 0) ? TimeToIso(last_trade) : "";
   string now_iso = TimeToIso(TimeGMT());

   bool full = ch.full_payload;

   string json = "{";
   json += "\"ea_version\":\""        + EA_VERSION + "\",";
   json += "\"account_login\":"       + IntegerToString(login) + ",";
   json += "\"account_currency\":\""  + JsonEscape(currency) + "\",";
   json += "\"account_company\":\""   + JsonEscape(company)  + "\",";
   json += "\"account_server\":\""    + JsonEscape(server)   + "\",";
   json += "\"balance\":"             + DoubleToString(full ? balance  : 0.0, 2) + ",";
   json += "\"equity\":"              + DoubleToString(equity, 2) + ",";
   json += "\"floating_pnl\":"        + DoubleToString(full ? floating : 0.0, 2) + ",";
   json += "\"daily_pnl\":"           + DoubleToString(full ? daily    : 0.0, 2) + ",";
   json += "\"open_positions\":"      + IntegerToString(full ? positions : 0) + ",";
   json += "\"last_trade_at\":\""     + (full ? last_trade_iso : "") + "\",";
   json += "\"terminal_hash\":\""     + term_hash + "\",";
   json += "\"timestamp\":\""         + now_iso + "\"";
   json += "}";
   return json;
}

//+------------------------------------------------------------------+
bool SendPayload(ChannelState &ch, const string json)
{
   string headers = "Content-Type: application/json\r\n"
                  + "Authorization: Bearer " + ch.key + "\r\n"
                  + "X-EA-Version: " + EA_VERSION + "\r\n";

   char   post[], result[];
   string result_headers;

   int json_len = StringLen(json);
   StringToCharArray(json, post, 0, json_len, CP_UTF8);
   if(ArraySize(post) > json_len) ArrayResize(post, json_len);

   ResetLastError();
   int status = WebRequest("POST", ch.url, headers, HTTP_TIMEOUT_MS,
                           post, result, result_headers);

   if(status == -1)
   {
      int err = GetLastError();
      if(err == 4060)
      {
         ch.url_not_allowed = true;
         Print("[Tradexperience][", ch.label,
               "] ERRO 4060: adicione a URL na whitelist do MT5.");
      }
      else
      {
         ScheduleBackoff(ch);
         if(VerboseLog)
            Print("[Tradexperience][", ch.label, "] WebRequest falhou. err=", err);
      }
      return false;
   }

   if(status >= 200 && status < 300)
   {
      if(VerboseLog) Print("[Tradexperience][", ch.label, "] OK ", status);
      return true;
   }

   if(status == 401 || status == 403)
   {
      ch.auth_blocked = true;
      Print("[Tradexperience][", ch.label, "] HTTP ", status,
            " - chave rejeitada. Canal pausado.");
      return false;
   }

   ScheduleBackoff(ch);
   if(VerboseLog)
      Print("[Tradexperience][", ch.label, "] HTTP ", status,
            " body=", CharArrayToString(result, 0, -1, CP_UTF8));
   return false;
}

//+------------------------------------------------------------------+
void ScheduleBackoff(ChannelState &ch)
{
   if(ch.backoff_sec == 0) ch.backoff_sec = 5;
   else                    ch.backoff_sec = (int)MathMin(ch.backoff_sec * 2, BACKOFF_MAX_SEC);
   ch.next_retry_ts = TimeCurrent() + ch.backoff_sec;
}

//+------------------------------------------------------------------+
//| Comment: estado consolidado dos dois canais                       |
//+------------------------------------------------------------------+
string ChannelStatusText(const ChannelState &ch)
{
   if(!ch.enabled)         return "desativado";
   if(ch.auth_blocked)     return "chave rejeitada";
   if(ch.url_not_allowed)  return "URL nao autorizada";
   if(ch.backoff_sec > 0)  return StringFormat("retry em %ds", ch.backoff_sec);
   if(ch.last_send_ts > 0) return StringFormat("ok @ %s", TimeToString(ch.last_send_ts, TIME_MINUTES));
   return "aguardando primeiro envio";
}

void UpdateStatusComment(const string status)
{
   Comment("Tradexperience MT5 v", EA_VERSION, " (somente leitura)\n",
           "Conta: ", AccountInfoInteger(ACCOUNT_LOGIN), "\n",
           "Status: ", status);
}

void RefreshStatusComment(double equity, double floating, int positions)
{
   string url_warning = "";
   if(g_strategy.url_not_allowed || g_treasury.url_not_allowed || g_portfolio.url_not_allowed)
      url_warning = "\n!! Adicione as URLs em Ferramentas > Opcoes > Expert Advisors !!";

   Comment("Tradexperience MT5 v", EA_VERSION, " (somente leitura)\n",
           "Conta: ", AccountInfoInteger(ACCOUNT_LOGIN), "\n",
           StringFormat("Equity: %.2f | Flut: %.2f | Pos: %d", equity, floating, positions), "\n",
           "Estrategia: ", ChannelStatusText(g_strategy), "\n",
           "Tesouraria: ", ChannelStatusText(g_treasury), "\n",
           "Portfolio:  ", ChannelStatusText(g_portfolio),
           url_warning);
}

//+------------------------------------------------------------------+
string TimeToIso(datetime t)
{
   MqlDateTime dt;
   TimeToStruct(t, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

string JsonEscape(const string s)
{
   string out = s;
   StringReplace(out, "\\", "\\\\");
   StringReplace(out, "\"", "\\\"");
   StringReplace(out, "\n", "\\n");
   StringReplace(out, "\r", "\\r");
   StringReplace(out, "\t", "\\t");
   return out;
}

string TerminalFingerprint()
{
   string path = TerminalInfoString(TERMINAL_PATH);
   ulong h = 1469598103934665603; // FNV-1a 64
   for(int i = 0; i < StringLen(path); i++)
   {
      h ^= (ulong)StringGetCharacter(path, i);
      h *= 1099511628211;
   }
   return StringFormat("%I64x", h);
}

//+------------------------------------------------------------------+
void OnTick() {}
//+------------------------------------------------------------------+
