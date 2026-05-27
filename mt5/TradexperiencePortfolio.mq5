//+------------------------------------------------------------------+
//|                                     TradexperiencePortfolio.mq5  |
//|                          Tradexperience - Live Portfolio (Client) |
//|                                                                  |
//|  Somente leitura. Envia telemetria da conta MT5 para a sessao    |
//|  Live Portfolio da Tradexperience (telemetria pessoal do usuario).|
//|  Nao abre, modifica ou fecha ordens.                              |
//+------------------------------------------------------------------+
#property copyright "Tradexperience"
#property link      "https://tradexperience.com.br"
#property version   "1.0"
#property strict
#property description "Live Portfolio Monitor. Somente leitura."

//--- Input visivel pro usuario
input string ApiKey = ""; // Chave gerada no Live Portfolio (txp_port_...)

//--- Constantes internas (nao visiveis no dialogo)
const string ApiUrl       = "https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/portfolio-mt5-ingest";
const int    IntervalSec  = 300;
const int    HeartbeatSec = 21600; // 6h — heartbeat sem mudancas nao desperdicca invocacoes
const bool   VerboseLog   = false;

#define EA_VERSION       "1.0.0"
#define HTTP_TIMEOUT_MS  5000
#define BACKOFF_MAX_SEC  60

//--- Estado interno
datetime g_last_send_ts    = 0;
datetime g_next_retry_ts   = 0;
int      g_backoff_sec     = 0;
bool     g_auth_blocked    = false;
bool     g_url_not_allowed = false;
string   g_cached_account_id = ""; // account_id cacheado para PostgREST force_sync

const string LinkIdUrl = "https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/portfolio-mt5-ingest/link-id";
const string AnonKey   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybWhsY25tYXFndWRxaXZrcGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzU0MDMsImV4cCI6MjA1NzgxMTQwM30.6smSMTKlRuHVt6MO5gWQIBwhFPJr6q7J0GS-yFlhWb8";

double   g_last_balance    = -1;
double   g_last_equity     = -1;
double   g_last_floating   = -1;
double   g_last_daily      = -1;
int      g_last_positions  = -1;
datetime g_last_trade_at   = 0;

//+------------------------------------------------------------------+
bool FetchAccountId()
{
   if(StringLen(ApiKey) < 10) return false;

   string headers = "Authorization: Bearer " + ApiKey + "\r\n"
                  + "Content-Type: application/json\r\n";
   char   postData[], result[];
   string responseHeaders;

   int res = WebRequest("GET", LinkIdUrl, headers, 5000, postData, result, responseHeaders);
   if(res == -1)
   {
      Print("[Tradexperience Portfolio] FetchAccountId falhou — adicione armhlcnmaqgudqivkpgt.supabase.co em Ferramentas→Opções→Expert Advisors.");
      return false;
   }
   if(res != 200) return false;

   string json = CharArrayToString(result);
   // Extrai "account_id":"<uuid>"
   string pattern = "\"account_id\":\"";
   int pos = StringFind(json, pattern);
   if(pos < 0) return false;
   pos += StringLen(pattern);
   int end = StringFind(json, "\"", pos);
   if(end < 0) return false;
   g_cached_account_id = StringSubstr(json, pos, end - pos);
   return StringLen(g_cached_account_id) > 0;
}

//+------------------------------------------------------------------+
bool CheckForceSync()
{
   if(StringLen(g_cached_account_id) == 0) return false;

   string url = "https://armhlcnmaqgudqivkpgt.supabase.co/rest/v1/portfolio_mt5_status"
              + "?account_id=eq." + g_cached_account_id
              + "&select=force_sync";

   string headers = "apikey: " + AnonKey + "\r\n"
                  + "Authorization: Bearer " + AnonKey + "\r\n";
   char   postData[], result[];
   string responseHeaders;

   int res = WebRequest("GET", url, headers, 5000, postData, result, responseHeaders);
   if(res != 200) return false;

   string json = CharArrayToString(result);
   return StringFind(json, "\"force_sync\":true") >= 0;
}

//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(ApiKey) < 10)
   {
      Comment("Tradexperience Portfolio: ApiKey vazia ou invalida.\n"
              "Cole a chave gerada no Live Portfolio e reanexe o EA.");
      Print("[Tradexperience Portfolio] ApiKey nao configurada. EA parado.");
      return(INIT_FAILED);
   }

   EventSetTimer(IntervalSec);
   SetStatusComment("Iniciando...");
   Print("[Tradexperience Portfolio] Iniciado. v", EA_VERSION,
         " | conta=", AccountInfoInteger(ACCOUNT_LOGIN));

   // Busca account_id para PostgREST force_sync (1 invocacao na inicializacao)
   FetchAccountId();
   // Primeiro envio imediato.
   OnTimer();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
   Print("[Tradexperience Portfolio] Finalizado. reason=", reason);
}

//+------------------------------------------------------------------+
void OnTimer()
{
   if(g_auth_blocked || g_url_not_allowed) return;
   if(TimeCurrent() < g_next_retry_ts)    return;

   double balance      = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
   double floating_pnl = 0.0;
   int    open_count   = 0;
   AggregateOpenPositions(floating_pnl, open_count);

   double   daily_pnl  = ComputeDailyPnL();
   datetime last_trade = ComputeLastTradeAt();

   bool changed = HasChanged(balance, equity, floating_pnl, daily_pnl, open_count, last_trade);
   bool heartbeat_due = (TimeCurrent() - g_last_send_ts) >= HeartbeatSec;
   // Evita invocacao desnecessaria: so verifica force_sync quando nao ha mudanca nem heartbeat
   if(!changed && !heartbeat_due && !CheckForceSync()) return;

   string json = BuildPayload(balance, equity, floating_pnl, daily_pnl, open_count, last_trade);
   if(SendPayload(json))
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
      floating_out += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
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
bool HasChanged(double balance, double equity, double floating, double daily,
                int positions, datetime last_trade)
{
   if(g_last_balance < 0) return true;
   if(MathAbs(balance  - g_last_balance)  > 0.001) return true;
   if(MathAbs(equity   - g_last_equity)   > 0.001) return true;
   if(MathAbs(floating - g_last_floating) > 0.001) return true;
   if(MathAbs(daily    - g_last_daily)    > 0.001) return true;
   if(positions != g_last_positions)               return true;
   if(last_trade != g_last_trade_at)               return true;
   return false;
}

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
bool SendPayload(const string json)
{
   string headers = "Content-Type: application/json\r\n"
                  + "Authorization: Bearer " + ApiKey + "\r\n"
                  + "X-EA-Version: " + EA_VERSION + "\r\n";

   char   post[], result[];
   string result_headers;

   int json_len = StringLen(json);
   StringToCharArray(json, post, 0, json_len, CP_UTF8);
   if(ArraySize(post) > json_len) ArrayResize(post, json_len);

   ResetLastError();
   int status = WebRequest("POST", ApiUrl, headers, HTTP_TIMEOUT_MS,
                           post, result, result_headers);

   if(status == -1)
   {
      int err = GetLastError();
      if(err == 4060)
      {
         g_url_not_allowed = true;
         SetStatusComment("URL nao autorizada no MT5.\n"
                          "Ferramentas > Opcoes > Expert Advisors > marque\n"
                          "\"Permitir WebRequest\" e adicione a URL.");
         Print("[Tradexperience Portfolio] ERRO 4060: URL fora da whitelist.");
      }
      else
      {
         ScheduleBackoff();
         SetStatusComment(StringFormat("Falha de rede (err=%d). Tentando em %ds.",
                                       err, g_backoff_sec));
         if(VerboseLog) Print("[Tradexperience Portfolio] WebRequest falhou. err=", err);
      }
      return false;
   }

   if(status >= 200 && status < 300)
   {
      if(VerboseLog) Print("[Tradexperience Portfolio] OK ", status);
      return true;
   }

   if(status == 401 || status == 403)
   {
      g_auth_blocked = true;
      SetStatusComment("Chave invalida ou revogada.\n"
                       "Gere uma nova no Live Portfolio e reanexe o EA.");
      Print("[Tradexperience Portfolio] HTTP ", status, " - chave rejeitada.");
      return false;
   }

   ScheduleBackoff();
   SetStatusComment(StringFormat("Servidor respondeu %d. Tentando em %ds.",
                                 status, g_backoff_sec));
   if(VerboseLog) Print("[Tradexperience Portfolio] HTTP ", status,
                        " body=", CharArrayToString(result, 0, -1, CP_UTF8));
   return false;
}

//+------------------------------------------------------------------+
void ScheduleBackoff()
{
   if(g_backoff_sec == 0) g_backoff_sec = 5;
   else                   g_backoff_sec = MathMin(g_backoff_sec * 2, BACKOFF_MAX_SEC);
   g_next_retry_ts = TimeCurrent() + g_backoff_sec;
}

//+------------------------------------------------------------------+
void SetStatusComment(const string status)
{
   Comment("Tradexperience Portfolio v", EA_VERSION, " (somente leitura)\n",
           "Conta: ", AccountInfoInteger(ACCOUNT_LOGIN), "\n",
           "Status: ", status);
}

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
   ulong h = 1469598103934665603;
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
