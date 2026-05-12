//+------------------------------------------------------------------+
//|                                       TradexperienceMonitor.mq5  |
//|                            Tradexperience - Monitor de Estrategia |
//|                                                                  |
//|  Somente leitura. Envia telemetria da conta (balance, equity,     |
//|  flutuante, P&L do dia, posicoes abertas) para a Tradexperience.  |
//|  Nao abre, modifica ou fecha ordens.                              |
//+------------------------------------------------------------------+
#property copyright "Tradexperience"
#property link      "https://tradexperience.com.br"
#property version   "1.00"
#property strict
#property description "Monitor somente-leitura. Envia telemetria da conta para a Tradexperience."

//--- Inputs visiveis pro usuario ao anexar o EA
input string ApiUrl       = "https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/mt5-ingest"; // URL do endpoint
input string ApiKey       = "";    // Chave gerada na plataforma Tradexperience
input int    IntervalSec  = 5;     // Frequencia de envio (segundos)
input int    HeartbeatSec = 30;    // Heartbeat mesmo sem mudancas (segundos)
input bool   VerboseLog   = false; // Log detalhado no Experts (debug)

//--- Constantes
#define EA_VERSION       "1.0.0"
#define HTTP_TIMEOUT_MS  5000
#define BACKOFF_MAX_SEC  60

//--- Estado interno
datetime g_last_send_ts      = 0;     // ultimo envio bem-sucedido (qualquer tipo)
datetime g_next_retry_ts     = 0;     // proxima tentativa permitida (backoff)
int      g_backoff_sec       = 0;     // backoff atual
bool     g_auth_blocked      = false; // 401/403 -> para de tentar ate restart
bool     g_url_not_allowed   = false; // 4060 -> URL fora da whitelist

// Snapshot do ultimo payload pra detectar mudanca
double   g_last_balance      = -1;
double   g_last_equity       = -1;
double   g_last_floating     = -1;
double   g_last_daily        = -1;
int      g_last_positions    = -1;
datetime g_last_trade_at     = 0;

//+------------------------------------------------------------------+
//| OnInit                                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(ApiKey) < 10)
   {
      Comment("Tradexperience Monitor: ApiKey vazia ou invalida.\n"
              "Cole a chave gerada na plataforma e reanexe o EA.");
      Print("[Tradexperience] ApiKey nao configurada. EA parado.");
      return(INIT_FAILED);
   }

   if(IntervalSec < 1) { Print("[Tradexperience] IntervalSec minimo = 1"); return(INIT_PARAMETERS_INCORRECT); }

   EventSetTimer(IntervalSec);
   SetStatusComment("Iniciando...");
   Print("[Tradexperience] Monitor iniciado. v", EA_VERSION, " | conta=", AccountInfoInteger(ACCOUNT_LOGIN));
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| OnDeinit                                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
   Print("[Tradexperience] Monitor finalizado. reason=", reason);
}

//+------------------------------------------------------------------+
//| OnTimer                                                           |
//+------------------------------------------------------------------+
void OnTimer()
{
   if(g_auth_blocked || g_url_not_allowed) return;
   if(TimeCurrent() < g_next_retry_ts)    return; // respeita backoff

   // Coleta estado da conta
   double balance      = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
   double floating_pnl = 0.0;
   int    open_count   = 0;
   AggregateOpenPositions(floating_pnl, open_count);

   double   daily_pnl    = ComputeDailyPnL();
   datetime last_trade   = ComputeLastTradeAt();

   bool changed = HasChanged(balance, equity, floating_pnl, daily_pnl, open_count, last_trade);
   bool heartbeat_due = (TimeCurrent() - g_last_send_ts) >= HeartbeatSec;

   if(!changed && !heartbeat_due) return;

   string json = BuildPayload(balance, equity, floating_pnl, daily_pnl, open_count, last_trade);
   bool ok = SendPayload(json);

   if(ok)
   {
      g_last_balance   = balance;
      g_last_equity    = equity;
      g_last_floating  = floating_pnl;
      g_last_daily     = daily_pnl;
      g_last_positions = open_count;
      g_last_trade_at  = last_trade;
      g_last_send_ts   = TimeCurrent();
      g_backoff_sec    = 0;
      g_next_retry_ts  = 0;
      SetStatusComment(StringFormat("Conectado | eq=%.2f | flut=%.2f | pos=%d",
                                    equity, floating_pnl, open_count));
   }
}

//+------------------------------------------------------------------+
//| Soma flutuante e conta posicoes abertas (sem filtro de magic)     |
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
//| Soma P&L de deals fechados no dia (UTC)                           |
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
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      // Considera deals que afetam o resultado (saidas, ajustes, comissoes/swap registrados)
      sum += HistoryDealGetDouble(ticket, DEAL_PROFIT)
           + HistoryDealGetDouble(ticket, DEAL_SWAP)
           + HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   }
   return sum;
}

//+------------------------------------------------------------------+
//| Timestamp do deal mais recente do historico (qualquer dia)        |
//+------------------------------------------------------------------+
datetime ComputeLastTradeAt()
{
   // Olha os ultimos 30 dias pra economizar (suficiente pra UI)
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
//| Detecta mudanca relevante vs ultimo envio                         |
//+------------------------------------------------------------------+
bool HasChanged(double balance, double equity, double floating, double daily,
                int positions, datetime last_trade)
{
   if(g_last_balance < 0) return true; // primeiro envio
   if(MathAbs(balance  - g_last_balance)  > 0.001) return true;
   if(MathAbs(equity   - g_last_equity)   > 0.001) return true;
   if(MathAbs(floating - g_last_floating) > 0.001) return true;
   if(MathAbs(daily    - g_last_daily)    > 0.001) return true;
   if(positions != g_last_positions)               return true;
   if(last_trade != g_last_trade_at)               return true;
   return false;
}

//+------------------------------------------------------------------+
//| Monta JSON do payload                                             |
//+------------------------------------------------------------------+
string BuildPayload(double balance, double equity, double floating, double daily,
                    int positions, datetime last_trade)
{
   long   login     = AccountInfoInteger(ACCOUNT_LOGIN);
   string currency  = AccountInfoString(ACCOUNT_CURRENCY);
   string company   = AccountInfoString(ACCOUNT_COMPANY);
   string server    = AccountInfoString(ACCOUNT_SERVER);
   string term_hash = TerminalFingerprint();

   string last_trade_iso = (last_trade > 0) ? TimeToIso(last_trade) : "";
   string now_iso = TimeToIso(TimeGMT());

   string json = "{";
   json += "\"ea_version\":\""        + EA_VERSION + "\",";
   json += "\"account_login\":"       + IntegerToString(login) + ",";
   json += "\"account_currency\":\""  + JsonEscape(currency) + "\",";
   json += "\"account_company\":\""   + JsonEscape(company)  + "\",";
   json += "\"account_server\":\""    + JsonEscape(server)   + "\",";
   json += "\"balance\":"             + DoubleToString(balance, 2)  + ",";
   json += "\"equity\":"              + DoubleToString(equity, 2)   + ",";
   json += "\"floating_pnl\":"        + DoubleToString(floating, 2) + ",";
   json += "\"daily_pnl\":"           + DoubleToString(daily, 2)    + ",";
   json += "\"open_positions\":"      + IntegerToString(positions)  + ",";
   json += "\"last_trade_at\":\""     + last_trade_iso + "\",";
   json += "\"terminal_hash\":\""     + term_hash + "\",";
   json += "\"timestamp\":\""         + now_iso + "\"";
   json += "}";
   return json;
}

//+------------------------------------------------------------------+
//| Envia payload via WebRequest. Retorna true em 2xx.                |
//+------------------------------------------------------------------+
bool SendPayload(const string json)
{
   string headers = "Content-Type: application/json\r\n"
                  + "Authorization: Bearer " + ApiKey + "\r\n"
                  + "X-EA-Version: " + EA_VERSION + "\r\n";

   char   post[], result[];
   string result_headers;

   int json_len = StringLen(json);
   StringToCharArray(json, post, 0, json_len, CP_UTF8);
   // Remove o null terminator que StringToCharArray adiciona
   if(ArraySize(post) > json_len) ArrayResize(post, json_len);

   ResetLastError();
   int status = WebRequest("POST", ApiUrl, headers, HTTP_TIMEOUT_MS,
                           post, result, result_headers);

   if(status == -1)
   {
      int err = GetLastError();
      if(err == 4060) // ERR_FUNCTION_NOT_ALLOWED -> URL fora da whitelist
      {
         g_url_not_allowed = true;
         SetStatusComment("URL nao autorizada no MT5.\n"
                          "Ferramentas > Opcoes > Expert Advisors > marque\n"
                          "\"Permitir WebRequest\" e adicione a URL.");
         Print("[Tradexperience] ERRO 4060: adicione a URL na whitelist do MT5.");
      }
      else
      {
         ScheduleBackoff();
         SetStatusComment(StringFormat("Falha de rede (err=%d). Tentando novamente em %ds.",
                                       err, g_backoff_sec));
         if(VerboseLog) Print("[Tradexperience] WebRequest falhou. err=", err);
      }
      return false;
   }

   if(status >= 200 && status < 300)
   {
      if(VerboseLog) Print("[Tradexperience] OK ", status);
      return true;
   }

   if(status == 401 || status == 403)
   {
      g_auth_blocked = true;
      SetStatusComment("Chave invalida ou revogada.\n"
                       "Gere uma nova chave na plataforma e reanexe o EA.");
      Print("[Tradexperience] HTTP ", status, " - chave rejeitada. EA pausado.");
      return false;
   }

   // 5xx, 429, etc. -> backoff
   ScheduleBackoff();
   SetStatusComment(StringFormat("Servidor respondeu %d. Tentando novamente em %ds.",
                                 status, g_backoff_sec));
   if(VerboseLog) Print("[Tradexperience] HTTP ", status, " body=", CharArrayToString(result, 0, -1, CP_UTF8));
   return false;
}

//+------------------------------------------------------------------+
//| Backoff exponencial: 5 -> 10 -> 20 -> 40 -> 60s                   |
//+------------------------------------------------------------------+
void ScheduleBackoff()
{
   if(g_backoff_sec == 0) g_backoff_sec = 5;
   else                   g_backoff_sec = MathMin(g_backoff_sec * 2, BACKOFF_MAX_SEC);
   g_next_retry_ts = TimeCurrent() + g_backoff_sec;
}

//+------------------------------------------------------------------+
//| Helpers                                                           |
//+------------------------------------------------------------------+
void SetStatusComment(const string status)
{
   Comment("Tradexperience Monitor v", EA_VERSION, " (somente leitura)\n",
           "Conta: ", AccountInfoInteger(ACCOUNT_LOGIN), "\n",
           "Status: ", status);
}

string TimeToIso(datetime t)
{
   // Formato ISO 8601 UTC: 2026-05-11T14:23:45Z
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
   // Hash simples do path do terminal pra detectar EA rodando em dois lugares
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
//| OnTick: nao usado (telemetria roda no OnTimer)                    |
//+------------------------------------------------------------------+
void OnTick() {}
//+------------------------------------------------------------------+
