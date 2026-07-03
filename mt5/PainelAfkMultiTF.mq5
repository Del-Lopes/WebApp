//+------------------------------------------------------------------+
//|                                          AfkMultiTF_Bitmap.mq5  |
//|                                          Tradexperience Community |
//+------------------------------------------------------------------+
#property copyright "Tradexperience Community"
#property link      ""
#property version   "1.00"
#property description "Trendmeter - Gauge Multi-Timeframe"

#property indicator_chart_window
#property indicator_buffers 5
#property indicator_plots   1

#property indicator_type1   DRAW_COLOR_CANDLES
#property indicator_color1  DarkGreen, Brown
#property indicator_label1  "HA Open;HA High;HA Low;HA Close"

#resource "Icone branco.png"

//=== INPUTS ===

input group "=== Timeframes ==="
input ENUM_TIMEFRAMES InpTF1 = PERIOD_M1;
input ENUM_TIMEFRAMES InpTF2 = PERIOD_M5;
input ENUM_TIMEFRAMES InpTF3 = PERIOD_M15;
input ENUM_TIMEFRAMES InpTF4 = PERIOD_H1;
input ENUM_TIMEFRAMES InpTF5 = PERIOD_D1;

input group "=== Medias Moveis ==="
input int InpMAPeriod = 8;

input group "=== Heiken Ashi ==="
input color InpHAColorBuy  = clrDarkGreen;
input color InpHAColorSell = clrBrown;

input group "=== Painel ==="
input int InpPanelX    = 20;
input int InpPanelY    = 30;
input int InpGaugeSize = 150;

#define GAUGE_GAP      8
#define TITLE_H        26
#define LABEL_H        68
#define BTN_W          22
#define BTN_H          18
#define ARC_START_DEG  150.0
#define ARC_TOTAL_DEG  240.0
#define NEEDLE_CENTER  270.0
#define NEEDLE_RANGE   120.0
#define RAD(x)        ((x) * M_PI / 180.0)
#define ALPHA(a,r,g,b) (((uint)(a)<<24)|((uint)(r)<<16)|((uint)(g)<<8)|(uint)(b))

double ExtOBuffer[];
double ExtHBuffer[];
double ExtLBuffer[];
double ExtCBuffer[];
double ExtColorBuffer[];

string ObjPrefix = "TM_";
ENUM_TIMEFRAMES TFs[5];
int    hMAHigh[5], hMALow[5];
double lastNeedle[5];
int    confirmedSignal[5];
double confirmedNeedle[5];
datetime lastCandleTime[5];
bool   isPanelMinimized = false;

uint   logoPixels[];
uint   logoW = 0, logoH = 0;

int    chartTFGaugeIdx = -1;
int    panelTotalW = 0;
int    panelTotalH = 0;

int    haStartBar = -1;   // bar index onde o sinal nao-neutral foi confirmado
int    haLastSignal = 0;  // ultimo sinal confirmado do gauge do TF atual

// Estados ricos por TF — combinacao de cor do ponteiro x zona do arco
// 0=Consolidacao 1=Em Alta 2=Pullback Alta 3=Em Baixa 4=Pullback Baixa 5=Engatando Alta 6=Engatando Baixa
int    richState[5];

// Licenca: WebRequest e' bloqueado em indicadores MT5 (sempre retorna 4014),
// entao usamos WinINet (DLL nativa do Windows) via #import. Funciona em
// OnInit/OnCalculate/OnTimer sem restricao de URL whitelist do MT5.
// Requer "Allow DLL imports" habilitado em Ferramentas > Opcoes > Expert Advisors.
//
// licenseStatus:  0 = pendente (aguardando validacao online), 1 = valida, -1 = invalida
int      licenseStatus    = 0;
datetime lastOnlineCheck  = 0;
bool     licensePrompted  = false;

//+------------------------------------------------------------------+
//| WinINet imports — HTTP/HTTPS nativo do Windows                    |
//| HANDLES sao ponteiros 64-bit no Win64: usar 'long' (8 bytes MQL5),
//| nao 'int' (4 bytes). Usamos InternetOpenUrlW (API simplificada)
//| para evitar HttpOpenRequestW que exige array LPCWSTR* terminado
//| em NULL — algo que MQL5 nao consegue construir corretamente.
//+------------------------------------------------------------------+
#import "wininet.dll"
long   InternetOpenW(string lpszAgent, int dwAccessType, string lpszProxy,
                     string lpszProxyBypass, int dwFlags);
long   InternetOpenUrlW(long hInternet, string lpszUrl, string lpszHeaders,
                        int dwHeadersLength, uint dwFlags, long dwContext);
int    InternetReadFile(long hFile, uchar &lpBuffer[], int dwNumberOfBytesToRead,
                        int &lpdwNumberOfBytesRead);
int    InternetCloseHandle(long hInternet);
#import

#define INTERNET_OPEN_TYPE_PRECONFIG    0
#define INTERNET_FLAG_SECURE            0x00800000
#define INTERNET_FLAG_NO_CACHE_WRITE    0x04000000
#define INTERNET_FLAG_RELOAD            0x80000000
#define INTERNET_FLAG_NO_AUTO_REDIRECT  0x00200000
#define INTERNET_FLAG_PRAGMA_NOCACHE    0x00000100

//+------------------------------------------------------------------+
//| Whitelist local: retorna true se conta+data estao autorizadas offline
//+------------------------------------------------------------------+
bool CheckLocalWhitelist()
  {
   struct stLocalLicense
     {
      long     account;
      datetime expiration;
     };

   stLocalLicense lic[] =
     {
        { 123456, D'2026.12.31 23:59' },  // exemplo: substituir por contas reais
        { 789012, D'2026.06.30 00:00' }
     };

   long     contaAtual = AccountInfoInteger(ACCOUNT_LOGIN);
   datetime hoje       = TimeCurrent();

   for(int i=0; i<ArraySize(lic); i++)
     {
      if(contaAtual == lic[i].account)
        {
         if(hoje < lic[i].expiration)
           {
            Print("Trendmeter: Conta autorizada via whitelist. Validade: ",
                  TimeToString(lic[i].expiration));
            return true;
           }
         else
           {
            Print("Trendmeter: Whitelist expirada (venceu ",
                  TimeToString(lic[i].expiration),
                  "). Verificacao online sera feita em background.");
            break;
           }
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
//| HttpGet: faz GET HTTPS via WinINet (InternetOpenUrl). Mais simples
//| e seguro que POST — evita arrays LPCWSTR* que MQL5 nao constroi.
//| Retorna body da resposta (string vazia em caso de erro).
//+------------------------------------------------------------------+
string HttpGet(string url)
  {
   long hSession = InternetOpenW("Trendmeter/1.0",
                                 INTERNET_OPEN_TYPE_PRECONFIG,
                                 NULL, NULL, 0);
   if(hSession == 0)
     {
      Print("Trendmeter: InternetOpen falhou. Verifique 'Allow DLL imports'.");
      return "";
     }

   uint flags = INTERNET_FLAG_SECURE
              | INTERNET_FLAG_NO_CACHE_WRITE
              | INTERNET_FLAG_RELOAD
              | INTERNET_FLAG_PRAGMA_NOCACHE;

   long hUrl = InternetOpenUrlW(hSession, url, NULL, 0, flags, 0);
   if(hUrl == 0)
     {
      Print("Trendmeter: InternetOpenUrl falhou (url=", url, ").");
      InternetCloseHandle(hSession);
      return "";
     }

   string  body = "";
   uchar   buf[4096];
   int     bytesRead = 0;
   int     totalRead = 0;
   while(InternetReadFile(hUrl, buf, 4096, bytesRead) != 0 && bytesRead > 0)
     {
      body += CharArrayToString(buf, 0, bytesRead, CP_UTF8);
      totalRead += bytesRead;
      if(totalRead > 65536) break;  // sanidade
     }

   InternetCloseHandle(hUrl);
   InternetCloseHandle(hSession);
   return body;
  }

//+------------------------------------------------------------------+
//| OnlineValidate: valida a licenca via GET com query string.
//| Backend deve aceitar GET /validate_boleta.php?account_no=NNNN
//+------------------------------------------------------------------+
bool OnlineValidate()
  {
   int    accountNumber = (int)AccountInfoInteger(ACCOUNT_LOGIN);
   string url = "https://tradexperience.com.br/validate_boleta.php?account_no="
              + IntegerToString(accountNumber);

   int maxAttempts = 3;
   for(int attempt=0; attempt<maxAttempts; attempt++)
     {
      if(attempt > 0)
        {
         Print("Trendmeter: Tentativa de validacao online ", attempt + 1);
         Sleep(2000);
        }
      else
        {
         Print("Trendmeter: Validando licenca online (WinINet GET).");
        }

      string body = HttpGet(url);
      Print("Trendmeter: Body=", body);

      if(StringFind(body, "success") >= 0) return true;
     }
   return false;
  }

//+------------------------------------------------------------------+
//| OnTimer: ponto onde WebRequest e' permitido em indicadores.
//| Faz a validacao online assincrona e revalida a cada 5 minutos.
//+------------------------------------------------------------------+
void OnTimer()
  {
   // Status definitivo (valido ou invalido) e tem cache de 5min
   if(licenseStatus != 0 &&
      TimeCurrent() - lastOnlineCheck < 300) return;

   bool ok = OnlineValidate();
   lastOnlineCheck = TimeCurrent();

   if(ok)
     {
      if(licenseStatus != 1)
         Print("Trendmeter: licenca validada online.");
      licenseStatus = 1;
      return;
     }

   licenseStatus = -1;
   if(!licensePrompted)
     {
      MessageBox("Licenca invalida ou expirada. O Trendmeter sera removido.\n"
                 "Adquira sua licenca em www.tradexperience.com.br",
                 "Trendmeter — Licenca", MB_ICONWARNING);
      licensePrompted = true;
     }
   Print("Trendmeter: licenca invalida — removendo indicador.");
   EventKillTimer();
   ChartIndicatorDelete(ChartID(), 0, "Trendmeter");
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   // Validacao em camadas:
   //   1) Tester: libera direto
   //   2) Whitelist local: libera direto
   //   3) Caso contrario: marca pendente, OnTimer faz validacao online em 2s
   if(MQLInfoInteger(MQL_TESTER))
     {
      licenseStatus = 1;  // tester nao valida online
     }
   else if(CheckLocalWhitelist())
     {
      licenseStatus = 1;
      EventSetTimer(300);  // revalida online a cada 5 minutos em background
     }
   else
     {
      licenseStatus = 0;
      EventSetTimer(2);  // primeira validacao online em 2 segundos
      Print("Trendmeter: aguardando validacao online em background...");
     }

   SetIndexBuffer(0, ExtOBuffer,     INDICATOR_DATA);
   SetIndexBuffer(1, ExtHBuffer,     INDICATOR_DATA);
   SetIndexBuffer(2, ExtLBuffer,     INDICATOR_DATA);
   SetIndexBuffer(3, ExtCBuffer,     INDICATOR_DATA);
   SetIndexBuffer(4, ExtColorBuffer, INDICATOR_COLOR_INDEX);

   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);
   IndicatorSetString(INDICATOR_SHORTNAME, "Trendmeter");
   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetInteger(0, PLOT_COLOR_INDEXES, 2);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 0, InpHAColorBuy);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 1, InpHAColorSell);

   TFs[0]=InpTF1; TFs[1]=InpTF2; TFs[2]=InpTF3;
   TFs[3]=InpTF4; TFs[4]=InpTF5;

   for(int i=0; i<5; i++)
     {
      hMAHigh[i]         = iMA(_Symbol, TFs[i], InpMAPeriod, 0, MODE_SMA, PRICE_HIGH);
      hMALow[i]          = iMA(_Symbol, TFs[i], InpMAPeriod, 0, MODE_SMA, PRICE_LOW);
      lastNeedle[i]      = -999;
      confirmedSignal[i] = 0;
      confirmedNeedle[i] = 0.0;
      lastCandleTime[i]  = 0;
      richState[i]     = 0;
     }

   chartTFGaugeIdx = -1;
   for(int i=0; i<5; i++)
      if(TFs[i] == Period()) { chartTFGaugeIdx = i; break; }

   panelTotalW = GAUGE_GAP + 5*(InpGaugeSize + GAUGE_GAP);
   panelTotalH = TITLE_H + InpGaugeSize + LABEL_H;

   if(!ResourceReadImage("::Icone branco.png", logoPixels, logoW, logoH))
     { logoW = 0; logoH = 0; }

   CreatePanel();
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
// Coloca seta acima da maxima (venda) ou abaixo da minima (compra)
// no candle anterior ao que ativou o sinal HA.
// Nome unico por timestamp para evitar duplicatas em reloads.
void PlaceSignalArrow(int signal, datetime t, double high, double low)
  {
   string name = ObjPrefix + "Arr_" + IntegerToString((long)t);
   if(ObjectFind(ChartID(), name) >= 0)
      ObjectDelete(ChartID(), name);

   ObjectCreate(ChartID(), name, OBJ_ARROW, 0, t, 0);
   ObjectSetInteger(ChartID(), name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(ChartID(), name, OBJPROP_HIDDEN,     true);
   ObjectSetInteger(ChartID(), name, OBJPROP_BACK,       false);
   ObjectSetInteger(ChartID(), name, OBJPROP_WIDTH,      2);

   // Gap fixo de 8 pontos do simbolo — visivel em qualquer tamanho de vela
   double gap = 8 * _Point;

   if(signal == -1)
     {
      // Venda: seta vermelha apontando para baixo, acima da maxima
      ObjectSetDouble(ChartID(),  name, OBJPROP_PRICE,     high + gap);
      ObjectSetInteger(ChartID(), name, OBJPROP_ARROWCODE, 234);  // seta baixo
      ObjectSetInteger(ChartID(), name, OBJPROP_COLOR,     clrRed);
      ObjectSetInteger(ChartID(), name, OBJPROP_FONTSIZE,  12);
     }
   else
     {
      // Compra: seta verde apontando para cima, abaixo da minima
      ObjectSetDouble(ChartID(),  name, OBJPROP_PRICE,     low - gap);
      ObjectSetInteger(ChartID(), name, OBJPROP_ARROWCODE, 233);  // seta cima
      ObjectSetInteger(ChartID(), name, OBJPROP_COLOR,     clrLime);
      ObjectSetInteger(ChartID(), name, OBJPROP_FONTSIZE,  12);
     }
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   for(int i=0; i<5; i++)
     {
      IndicatorRelease(hMAHigh[i]);
      IndicatorRelease(hMALow[i]);
     }
   ObjectsDeleteAll(ChartID(), ObjPrefix);
   ChartRedraw();
  }

//+------------------------------------------------------------------+
// CORNER_LEFT_LOWER: Y=0 e' a borda inferior da janela.
// OBJ_RECTANGLE_LABEL: YDISTANCE = distancia da borda inferior ate o TOPO do objeto.
// OBJ_BITMAP_LABEL com ANCHOR_LEFT_LOWER: YDISTANCE = distancia ate a BASE do objeto.
// OBJ_LABEL com ANCHOR_LOWER: YDISTANCE = distancia ate a BASE do texto.
//
// Layout (de baixo para cima a partir de InpPanelY):
//   InpPanelY                                    = base dos labels (sinal/TF)
//   InpPanelY + LABEL_H                          = base dos gauges
//   InpPanelY + LABEL_H + InpGaugeSize           = topo dos gauges / base do titulo
//   InpPanelY + LABEL_H + InpGaugeSize + TITLE_H = topo do painel
//
void CreatePanel()
  {
   int bgTopY = InpPanelY + panelTotalH;

   ObjRectLL(ObjPrefix+"BG", InpPanelX, bgTopY, panelTotalW, panelTotalH,
             C'10,14,24', C'50,55,75', true);

   int titleTopY = InpPanelY + LABEL_H + InpGaugeSize + TITLE_H;
   ObjRectLL(ObjPrefix+"Title", InpPanelX, titleTopY, panelTotalW, TITLE_H,
             C'18,22,38', C'60,65,90', true);

   int titleMidY = InpPanelY + LABEL_H + InpGaugeSize + TITLE_H/2;
   ObjLabelLL(ObjPrefix+"TitleLbl", "  Trendmeter",
              InpPanelX + 8, titleMidY, clrWhite, 11, ANCHOR_LEFT);

   // OBJ_BUTTON com CORNER_LEFT_LOWER: YDISTANCE = distancia da borda inferior ao TOPO do botao
   // Topo do botao = meio da barra de titulo + metade da altura do botao
   int btnTopY = titleMidY + BTN_H/2;
   int btnX1   = InpPanelX + panelTotalW - BTN_W - 4;
   int btnX2   = btnX1 - BTN_W - 2;
   ObjButtonLL(ObjPrefix+"BtnClose", "X", btnX1, btnTopY, BTN_W, BTN_H, C'150,28,28', clrWhite);
   ObjButtonLL(ObjPrefix+"BtnMin",   "_", btnX2, btnTopY, BTN_W, BTN_H, C'40,44,60',  clrWhite);

   if(!isPanelMinimized)
      CreateGaugeObjects();
  }

//+------------------------------------------------------------------+
void CreateAnalysisLabel()
  {
   // Linha 1 (cenario): base em InpPanelY+30
   ObjLabelLL(ObjPrefix+"Analysis1", "Aguardando dados...",
              InpPanelX + 10, InpPanelY + 30,
              clrGold, 9, ANCHOR_LEFT_LOWER);
   ObjectSetString(ChartID(), ObjPrefix+"Analysis1", OBJPROP_FONT, "Segoe UI");

   // Linha 2 (momento): base em InpPanelY+14
   ObjLabelLL(ObjPrefix+"Analysis2", "",
              InpPanelX + 10, InpPanelY + 14,
              clrGold, 9, ANCHOR_LEFT_LOWER);
   ObjectSetString(ChartID(), ObjPrefix+"Analysis2", OBJPROP_FONT, "Segoe UI");
  }

//+------------------------------------------------------------------+
void CreateGaugeObjects()
  {
   for(int i=0; i<5; i++)
     {
      int gx  = InpPanelX + GAUGE_GAP + i*(InpGaugeSize + GAUGE_GAP);
      int gcx = gx + InpGaugeSize/2;

      string bmpName = ObjPrefix+"Bmp_"+IntegerToString(i);
      if(ObjectFind(ChartID(), bmpName) < 0)
        {
         ObjectCreate(ChartID(), bmpName, OBJ_BITMAP_LABEL, 0, 0, 0);
         ObjectSetInteger(ChartID(), bmpName, OBJPROP_XDISTANCE,  gx);
         ObjectSetInteger(ChartID(), bmpName, OBJPROP_YDISTANCE,  InpPanelY + LABEL_H);
         ObjectSetInteger(ChartID(), bmpName, OBJPROP_CORNER,     CORNER_LEFT_LOWER);
         ObjectSetInteger(ChartID(), bmpName, OBJPROP_ANCHOR,     ANCHOR_LEFT_LOWER);
         ObjectSetInteger(ChartID(), bmpName, OBJPROP_SELECTABLE, false);
         ObjectSetInteger(ChartID(), bmpName, OBJPROP_BACK,       false);
        }

      // Label do TF — linha superior da area de rodape
      ObjLabelLL(ObjPrefix+"TF_"+IntegerToString(i), TFToString(TFs[i]),
                 gcx, InpPanelY + 52, clrWhite, 9, ANCHOR_LOWER);
     }
   CreateAnalysisLabel();
  }

//+------------------------------------------------------------------+
void SetMinimized(bool minimize)
  {
   isPanelMinimized = minimize;
   if(minimize)
     {
      ObjectSetInteger(ChartID(), ObjPrefix+"BG", OBJPROP_YSIZE,    TITLE_H);
      ObjectSetInteger(ChartID(), ObjPrefix+"BG", OBJPROP_YDISTANCE, InpPanelY + TITLE_H);
      for(int i=0; i<5; i++)
        {
         ObjectSetInteger(ChartID(), ObjPrefix+"Bmp_"+IntegerToString(i), OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
         ObjectSetInteger(ChartID(), ObjPrefix+"TF_"+IntegerToString(i),  OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
        }
      ObjectSetInteger(ChartID(), ObjPrefix+"Analysis1", OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
      ObjectSetInteger(ChartID(), ObjPrefix+"Analysis2", OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
      ObjectSetString(ChartID(), ObjPrefix+"BtnMin", OBJPROP_TEXT, "+");
     }
   else
     {
      ObjectSetInteger(ChartID(), ObjPrefix+"BG", OBJPROP_YSIZE,    panelTotalH);
      ObjectSetInteger(ChartID(), ObjPrefix+"BG", OBJPROP_YDISTANCE, InpPanelY + panelTotalH);
      for(int i=0; i<5; i++)
        {
         ObjectSetInteger(ChartID(), ObjPrefix+"Bmp_"+IntegerToString(i), OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
         ObjectSetInteger(ChartID(), ObjPrefix+"TF_"+IntegerToString(i),  OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
        }
      ObjectSetInteger(ChartID(), ObjPrefix+"Analysis1", OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
      ObjectSetInteger(ChartID(), ObjPrefix+"Analysis2", OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
      ObjectSetString(ChartID(), ObjPrefix+"BtnMin", OBJPROP_TEXT, "_");
      for(int i=0; i<5; i++) lastNeedle[i] = -999;
     }
   ChartRedraw();
  }

//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long& lparam,
                  const double& dparam, const string& sparam)
  {
   if(id != CHARTEVENT_OBJECT_CLICK) return;
   if(sparam == ObjPrefix+"BtnClose")
     { ChartIndicatorDelete(ChartID(), 0, "Trendmeter"); return; }
   if(sparam == ObjPrefix+"BtnMin")
     {
      SetMinimized(!isPanelMinimized);
      ObjectSetInteger(ChartID(), sparam, OBJPROP_STATE, false);
      return;
     }
  }

//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &Time[],
                const double &Open[],
                const double &High[],
                const double &Low[],
                const double &Close[],
                const long &TickVolume[],
                const long &Volume[],
                const int &Spread[])
  {
   // Bloqueia processamento se licenca invalidada (timer ja delegou remocao)
   if(licenseStatus == -1) return rates_total;
   // Aguarda primeira validacao online se nao passou pela whitelist
   if(licenseStatus == 0)  return rates_total;

   int limit;
   if(prev_calculated == 0)
     {
      ExtLBuffer[0] = Low[0];
      ExtHBuffer[0] = High[0];
      ExtOBuffer[0] = Open[0];
      ExtCBuffer[0] = Close[0];
      limit = 1;
     }
   else
      limit = prev_calculated - 1;

   for(int i = limit; i < rates_total && !IsStopped(); i++)
     {
      double haOpen  = (ExtOBuffer[i-1] + ExtCBuffer[i-1]) / 2.0;
      double haClose = (Open[i] + High[i] + Low[i] + Close[i]) / 4.0;
      double haHigh  = MathMax(High[i], MathMax(haOpen, haClose));
      double haLow   = MathMin(Low[i],  MathMin(haOpen, haClose));
      ExtOBuffer[i] = haOpen;
      ExtHBuffer[i] = haHigh;
      ExtLBuffer[i] = haLow;
      ExtCBuffer[i] = haClose;
      ExtColorBuffer[i] = EMPTY_VALUE;
     }

   if(!isPanelMinimized)
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double mid = (bid + ask) / 2.0;

      for(int i=0; i<5; i++)
        {
         double maHighBuf[2], maLowBuf[2];
         if(CopyBuffer(hMAHigh[i], 0, 0, 2, maHighBuf) <= 0) continue;
         if(CopyBuffer(hMALow[i],  0, 0, 2, maLowBuf)  <= 0) continue;

         double maHighNow    = maHighBuf[0];
         double maLowNow     = maLowBuf[0];
         double maHighClosed = maHighBuf[1];
         double maLowClosed  = maLowBuf[1];

         double openBuf[1];
         datetime timeBuf[1];
         if(CopyOpen(_Symbol, TFs[i], 0, 1, openBuf) <= 0) continue;
         if(CopyTime(_Symbol, TFs[i], 0, 1, timeBuf) <= 0) continue;

         double candleOpen = openBuf[0];

         int openSignal = 0;
         if(candleOpen >= maHighNow)     openSignal =  1;
         else if(candleOpen <= maLowNow) openSignal = -1;

         double range = maHighNow - maLowNow;
         double needleVisual;
         int    signalVisual;
         if(mid >= maHighNow)      { signalVisual =  1; needleVisual =  1.0; }
         else if(mid <= maLowNow)  { signalVisual = -1; needleVisual = -1.0; }
         else
           {
            signalVisual = 0;
            needleVisual = (range > 0) ? ((mid - maLowNow) / range) * 2.0 - 1.0 : 0.0;
           }

         bool newCandle    = (timeBuf[0] != lastCandleTime[i]);
         bool openChanged  = (openSignal != 0 && openSignal != confirmedSignal[i]);
         bool closeChanged = false;

         if(newCandle && lastCandleTime[i] != 0)
           {
            double prevClose[1];
            if(CopyClose(_Symbol, TFs[i], 1, 1, prevClose) > 0)
              {
               int closedSignal = 0;
               if(prevClose[0] >= maHighClosed)     closedSignal =  1;
               else if(prevClose[0] <= maLowClosed) closedSignal = -1;
               if(closedSignal != confirmedSignal[i])
                 { confirmedSignal[i] = closedSignal; closeChanged = true; }
              }
            lastCandleTime[i] = timeBuf[0];
           }
         else if(newCandle)
            lastCandleTime[i] = timeBuf[0];

         if(openChanged && !closeChanged)
            confirmedSignal[i] = openSignal;

         confirmedNeedle[i] = needleVisual;

         // Estado rico: combinacao COR do ponteiro x ZONA visual do arco onde aponta.
         // O ponteiro varre 120 graus (NEEDLE_RANGE), mas o arco cobre 240 graus
         // (ARC_TOTAL_DEG). As zonas do arco sao divididas em tercos iguais (33%, 67%).
         // Mapeando: needleVisual=+1 aponta para 330deg, que cai no terco final do arco
         // (zona verde 310-390deg). Para ficar VISUALMENTE na zona verde, precisamos
         // do ponteiro >= 310deg, ou seja needleVisual >= (310-270)/60 = 0.667.
         //
         //   COR        ZONA          ESTADO
         //   verde      verde         Em Alta            (1)
         //   verde      amarela       Pullback da Alta   (2)
         //   vermelho   vermelha      Em Baixa           (3)
         //   vermelho   amarela       Pullback da Baixa  (4)
         //   amarelo    verde         Engatando Alta     (5)
         //   amarelo    vermelha      Engatando Baixa    (6)
         //   amarelo    amarela       Consolidacao       (0)
         int zona;
         if(needleVisual >=  0.667)     zona =  1;  // ponteiro na zona verde
         else if(needleVisual <= -0.667) zona = -1; // ponteiro na zona vermelha
         else                             zona =  0; // ponteiro na zona amarela

         int cor = confirmedSignal[i];

         if(cor == 1 && zona == 1)        richState[i] = 1;
         else if(cor == 1 && zona == 0)   richState[i] = 2;
         else if(cor == -1 && zona == -1) richState[i] = 3;
         else if(cor == -1 && zona == 0)  richState[i] = 4;
         else if(cor == 0 && zona == 1)   richState[i] = 5;
         else if(cor == 0 && zona == -1)  richState[i] = 6;
         else                              richState[i] = 0;

         bool needRedraw = (MathAbs(needleVisual - lastNeedle[i]) > 0.01)
                           || prev_calculated == 0
                           || closeChanged || openChanged;

         if(needRedraw)
           {
            RenderGauge(i, needleVisual, confirmedSignal[i]);
            lastNeedle[i] = needleVisual;
           }

         UpdateSignalLabel(i, confirmedSignal[i]);
        }
      UpdateAnalysis();
     }

   // HA: pintar a partir do candle que confirmou o sinal nao-neutral
   if(chartTFGaugeIdx >= 0)
     {
      int curSignal = confirmedSignal[chartTFGaugeIdx];

      if(curSignal == 0)
        {
         // Voltou para neutral: apaga tudo e reseta
         if(haLastSignal != 0)
           {
            for(int i = 1; i < rates_total; i++)
               ExtColorBuffer[i] = EMPTY_VALUE;
            haStartBar  = -1;
            haLastSignal = 0;
           }
        }
      else
        {
         // Sinal ativo (BUY ou SELL)
         if(haLastSignal != curSignal)
           {
            // Sinal mudou (neutral->ativo ou BUY->SELL): apaga historico e marca inicio
            for(int i = 1; i < rates_total; i++)
               ExtColorBuffer[i] = EMPTY_VALUE;
            haStartBar   = rates_total - 1;  // candle atual e o primeiro
            haLastSignal = curSignal;

            // Seta no candle anterior ao que ativou o sinal
            int arrowBar = rates_total - 2;
            if(arrowBar >= 0)
               PlaceSignalArrow(curSignal, Time[arrowBar],
                                High[arrowBar], Low[arrowBar]);
           }

         // Pintar a partir do haStartBar
         if(haStartBar >= 1 && haStartBar < rates_total)
           {
            int paintFrom = (prev_calculated <= 1) ? haStartBar : MathMax(haStartBar, prev_calculated - 1);
            for(int i = paintFrom; i < rates_total; i++)
               ExtColorBuffer[i] = (ExtOBuffer[i] < ExtCBuffer[i]) ? 0.0 : 1.0;
           }
        }
     }

   ChartRedraw();
   return rates_total;
  }

//+------------------------------------------------------------------+
uint BlendPixel(uint dst, uint src)
  {
   uint sa = (src >> 24) & 0xFF;
   if(sa == 0)   return dst;
   if(sa == 255) return src;
   uint da = (dst >> 24) & 0xFF;
   uint sr = (src >> 16) & 0xFF, sg = (src >> 8) & 0xFF, sb = src & 0xFF;
   uint dr = (dst >> 16) & 0xFF, dg = (dst >> 8) & 0xFF, db = dst & 0xFF;
   uint a = sa + da * (255 - sa) / 255;
   uint r = (sr * sa + dr * (255 - sa)) / 255;
   uint g = (sg * sa + dg * (255 - sa)) / 255;
   uint b = (sb * sa + db * (255 - sa)) / 255;
   return ALPHA(a, r, g, b);
  }

void SetPixel(uint &pixels[], int sz, int x, int y, uint clr)
  {
   if(x < 0 || x >= sz || y < 0 || y >= sz) return;
   pixels[y * sz + x] = BlendPixel(pixels[y * sz + x], clr);
  }

//+------------------------------------------------------------------+
void RenderGauge(int idx, double needlePos, int signal)
  {
   int  sz = InpGaugeSize;
   uint pixels[];
   ArrayResize(pixels, sz * sz);
   ArrayInitialize(pixels, ALPHA(255, 8, 10, 20));

   int cx = sz / 2;
   int cy = (int)(sz * 0.56);
   int R  = sz / 2 - 5;
   int Ri = R - 18;

   uint neonR, neonG, neonB;
   if(signal ==  1)      { neonR =  0; neonG = 255; neonB = 120; }
   else if(signal == -1) { neonR = 255; neonG =  40; neonB =  40; }
   else                  { neonR = 255; neonG = 200; neonB =   0; }

   for(int px = 0; px < sz; px++)
      for(int py = 0; py < sz; py++)
        {
         double dx = px-cx, dy = py-cy;
         double dist = MathSqrt(dx*dx + dy*dy);
         if(dist > R+3) continue;
         double t = MathMin(dist/(R+3), 1.0);
         pixels[py*sz+px] = ALPHA(255,(uint)(8+t*18),(uint)(10+t*14),(uint)(20+t*40));
        }

   for(int px = 0; px < sz; px++)
      for(int py = 0; py < sz; py++)
        {
         double dx = px-cx, dy = py-cy;
         double dist = MathSqrt(dx*dx+dy*dy);
         double glowR=R+4, glowW=12.0;
         if(dist < glowR || dist > glowR+glowW) continue;
         double angDeg = MathArctan2(dy,dx)*180.0/M_PI;
         if(angDeg < 0) angDeg += 360.0;
         double relAng = angDeg - ARC_START_DEG;
         if(relAng < 0) relAng += 360.0;
         if(relAng > ARC_TOTAL_DEG) continue;
         double fade = (1.0-(dist-glowR)/glowW)*0.5;
         fade = MathMax(0.0, MathMin(1.0, fade));
         uint clr = ArcColorARGB(relAng/ARC_TOTAL_DEG);
         SetPixel(pixels, sz, px, py,
                  ALPHA((uint)(fade*180),(clr>>16)&0xFF,(clr>>8)&0xFF,clr&0xFF));
        }

   for(int px = 0; px < sz; px++)
      for(int py = 0; py < sz; py++)
        {
         double dx = px-cx, dy = py-cy;
         double dist = MathSqrt(dx*dx+dy*dy);
         if(dist > R || dist < Ri) continue;
         double angDeg = MathArctan2(dy,dx)*180.0/M_PI;
         if(angDeg < 0) angDeg += 360.0;
         double relAng = angDeg - ARC_START_DEG;
         if(relAng < 0) relAng += 360.0;
         if(relAng > ARC_TOTAL_DEG) continue;
         uint clr = ArcColorARGB(relAng/ARC_TOTAL_DEG);
         uint cr  = (clr>>16)&0xFF, cg = (clr>>8)&0xFF, cb = clr&0xFF;
         double midDist = (Ri+R)/2.0, halfW = (R-Ri)/2.0;
         double bright  = MathMax(0.3, 1.0-MathPow((dist-midDist)/halfW, 2.0));
         double neonLine= MathExp(-MathPow((dist-midDist)/(halfW*0.35), 2.0));
         uint fr = (uint)MathMin(255.0, cr*bright + 255*neonLine*0.6);
         uint fg = (uint)MathMin(255.0, cg*bright + 255*neonLine*0.6);
         uint fb = (uint)MathMin(255.0, cb*bright + 200*neonLine*0.4);
         double fadeOut=1.0, fadeIn=1.0;
         if(dist > R-1.5)  fadeOut = (R-dist)/1.5;
         if(dist < Ri+1.5) fadeIn  = (dist-Ri)/1.5;
         double alpha = MathMax(0.0, MathMin(1.0, MathMin(fadeOut,fadeIn)));
         SetPixel(pixels, sz, px, py, ALPHA((uint)(alpha*255), fr, fg, fb));
        }

   for(int t = 0; t <= 12; t++)
     {
      bool   isMaj = (t==0 || t==6 || t==12);
      double deg   = ARC_START_DEG + (double)t/12.0*ARC_TOTAL_DEG;
      double rad   = RAD(deg);
      int    tOut  = R-1, tIn = isMaj ? R-14 : R-8;
      int    x1=cx+(int)(tOut*MathCos(rad)), y1=cy+(int)(tOut*MathSin(rad));
      int    x2=cx+(int)(tIn *MathCos(rad)), y2=cy+(int)(tIn *MathSin(rad));
      DrawLine(pixels, sz, x1, y1, x2, y2,
               isMaj ? ALPHA(255,255,255,255) : ALPHA(200,180,180,200));
      if(isMaj)
        {
         DrawLine(pixels, sz, x1-1,y1,x2-1,y2, ALPHA(80,200,220,255));
         DrawLine(pixels, sz, x1+1,y1,x2+1,y2, ALPHA(80,200,220,255));
        }
     }

   for(int s = 0; s <= 720; s++)
     {
      double rad = RAD((double)s/2.0);
      SetPixel(pixels, sz, cx+(int)(Ri*MathCos(rad)), cy+(int)(Ri*MathSin(rad)),
               ALPHA(120,60,70,100));
     }

   double needleDeg = NEEDLE_CENTER + needlePos*(NEEDLE_RANGE/2.0);
   double needleRad = RAD(needleDeg);
   int    needleLen = (int)(R * 0.92);
   int    nx = cx+(int)(needleLen*MathCos(needleRad));
   int    ny = cy+(int)(needleLen*MathSin(needleRad));

   double perpRad = needleRad + M_PI/2.0;
   double perpX   = MathCos(perpRad), perpY = MathSin(perpRad);
   int baseThick=8, tipThick=2, steps2=10;
   for(int s = 0; s < steps2; s++)
     {
      double t0=(double)s/steps2, t1=(double)(s+1)/steps2;
      double hw0=(baseThick-t0*(baseThick-tipThick))*0.5;
      double hw1=(baseThick-t1*(baseThick-tipThick))*0.5;
      int ax=cx+(int)(needleLen*t0*MathCos(needleRad)), ay=cy+(int)(needleLen*t0*MathSin(needleRad));
      int bx=cx+(int)(needleLen*t1*MathCos(needleRad)), by=cy+(int)(needleLen*t1*MathSin(needleRad));
      int maxW=(int)(hw0+1);
      for(int o=-maxW; o<=maxW; o++)
        {
         double hw=(hw0+hw1)*0.5;
         if(MathAbs(o) > hw+0.5) continue;
         int ox=(int)(o*perpX), oy=(int)(o*perpY);
         DrawLine(pixels, sz, ax+ox, ay+oy, bx+ox, by+oy, ALPHA(255,neonR,neonG,neonB));
        }
     }
   DrawLine(pixels, sz, cx, cy, nx, ny, ALPHA(180,255,255,255));

   if(logoW > 0 && logoH > 0)
     {
      int logoScale = 44;
      int lx = cx - logoScale/2;
      int ly = cy - logoScale/2 - 6;
      for(int py2 = 0; py2 < logoScale; py2++)
         for(int px2 = 0; px2 < logoScale; px2++)
           {
            int srcX = (int)MathRound((double)px2/logoScale * logoW);
            int srcY = (int)MathRound((double)py2/logoScale * logoH);
            if(srcX >= (int)logoW) srcX = (int)logoW-1;
            if(srcY >= (int)logoH) srcY = (int)logoH-1;
            uint pix  = logoPixels[srcY*(int)logoW + srcX];
            uint aVal = (pix >> 24) & 0xFF;
            uint bVal = (pix >> 16) & 0xFF;
            uint gVal = (pix >>  8) & 0xFF;
            uint rVal =  pix        & 0xFF;
            if(aVal < 15) continue;
            SetPixel(pixels, sz, lx+px2, ly+py2, ALPHA(aVal, rVal, gVal, bVal));
           }
     }

   int cr2 = 10;
   int glowRad = cr2 + 9;
   for(int px = cx-glowRad; px <= cx+glowRad; px++)
      for(int py = cy-glowRad; py <= cy+glowRad; py++)
        {
         if(px<0||py<0||px>=sz||py>=sz) continue;
         double dx=px-cx, dy=py-cy;
         double dist=MathSqrt(dx*dx+dy*dy);
         if(dist < cr2 || dist > glowRad) continue;
         double fade = 1.0-(dist-cr2)/(double)(glowRad-cr2);
         fade = MathPow(fade,2.0)*0.6;
         SetPixel(pixels,sz,px,py,ALPHA((uint)(fade*255),neonR,neonG,neonB));
        }
   for(int px = cx-cr2-1; px <= cx+cr2+1; px++)
      for(int py = cy-cr2-1; py <= cy+cr2+1; py++)
        {
         if(px<0||py<0||px>=sz||py>=sz) continue;
         double dx=px-cx, dy=py-cy;
         double dist=MathSqrt(dx*dx+dy*dy);
         if(dist < cr2-0.5 || dist > cr2+1.0) continue;
         double t = MathMax(0.0, 1.0-MathAbs(dist-cr2));
         SetPixel(pixels,sz,px,py,ALPHA((uint)(t*230),neonR,neonG,neonB));
        }
   for(int px = cx-cr2+1; px <= cx+cr2-1; px++)
      for(int py = cy-cr2+1; py <= cy+cr2-1; py++)
        {
         if(px<0||py<0||px>=sz||py>=sz) continue;
         double dx=px-cx, dy=py-cy;
         double dist=MathSqrt(dx*dx+dy*dy);
         if(dist >= cr2-1) continue;
         double base = 0.3+0.5*(1.0-dist/(cr2-1));
         uint lr = (uint)(neonR*base);
         uint lg = (uint)(neonG*base);
         uint lb = (uint)(neonB*base);
         double reflex = MathMax(0.0, 1.0-MathSqrt((dx+cr2*0.3)*(dx+cr2*0.3)+(dy+cr2*0.35)*(dy+cr2*0.35))/(cr2*0.55));
         reflex = MathPow(reflex,2.0)*0.75;
         lr = (uint)MathMin(255.0, lr+255*reflex);
         lg = (uint)MathMin(255.0, lg+255*reflex);
         lb = (uint)MathMin(255.0, lb+255*reflex);
         pixels[py*sz+px] = ALPHA(255, lr, lg, lb);
        }

   //=== 10. TEXTO DO SINAL (dentro do gauge, abaixo da bolinha) ===
   string sigText;
   uint   sigR, sigG, sigB;
   if(signal ==  1) { sigText="BUY";     sigR=  0; sigG=220; sigB= 80; }
   else if(signal==-1) { sigText="SELL"; sigR=255; sigG= 60; sigB= 60; }
   else               { sigText="NEUTRAL"; sigR=255; sigG=200; sigB=  0; }
   DrawTextBitmap(pixels, sz, cx, cy + cr2 + 8, sigText, sigR, sigG, sigB, 1);

   //=== 11. PUBLICAR ===
   string resName = ObjPrefix+"Res_"+IntegerToString(idx);
   ResourceCreate(resName, pixels, sz, sz, 0, 0, sz, COLOR_FORMAT_ARGB_NORMALIZE);
   ObjectSetString(ChartID(), ObjPrefix+"Bmp_"+IntegerToString(idx),
                   OBJPROP_BMPFILE, "::"+resName);
  }

//+------------------------------------------------------------------+
// Fonte bitmap 5x7 — cada char e' uma mascara de 5 colunas x 7 linhas (35 bits em uint[5])
// Cada elemento do array e' uma coluna, bit 0 = linha topo
//+------------------------------------------------------------------+
// Fonte bitmap 7 colunas x 9 linhas — tamanho intermediario entre 5x7 e 5x7 scale=2
// Cada coluna e' um uint16 (9 bits usados), bit 0 = linha topo
void DrawCharBitmap(uint &pixels[], int sz, int x, int y,
                    uchar ch, uint r, uint g, uint b, int scale)
  {
   ushort col[7];
   switch(ch)
     {
      case 'B': col[0]=0x1FF; col[1]=0x111; col[2]=0x111; col[3]=0x111; col[4]=0x111; col[5]=0x111; col[6]=0x0EE; break;
      case 'U': col[0]=0x0FF; col[1]=0x100; col[2]=0x100; col[3]=0x100; col[4]=0x100; col[5]=0x100; col[6]=0x0FF; break;
      case 'Y': col[0]=0x003; col[1]=0x004; col[2]=0x008; col[3]=0x1F0; col[4]=0x008; col[5]=0x004; col[6]=0x003; break;
      case 'S': col[0]=0x0C6; col[1]=0x122; col[2]=0x112; col[3]=0x10A; col[4]=0x106; col[5]=0x102; col[6]=0x0C1; break;
      case 'E': col[0]=0x1FF; col[1]=0x111; col[2]=0x111; col[3]=0x111; col[4]=0x111; col[5]=0x111; col[6]=0x100; break;
      case 'L': col[0]=0x1FF; col[1]=0x100; col[2]=0x100; col[3]=0x100; col[4]=0x100; col[5]=0x100; col[6]=0x100; break;
      case 'N': col[0]=0x1FF; col[1]=0x002; col[2]=0x004; col[3]=0x008; col[4]=0x010; col[5]=0x020; col[6]=0x1FF; break;
      case 'T': col[0]=0x001; col[1]=0x001; col[2]=0x001; col[3]=0x1FF; col[4]=0x001; col[5]=0x001; col[6]=0x001; break;
      case 'A': col[0]=0x1FE; col[1]=0x021; col[2]=0x021; col[3]=0x021; col[4]=0x021; col[5]=0x021; col[6]=0x1FE; break;
      case 'R': col[0]=0x1FF; col[1]=0x021; col[2]=0x021; col[3]=0x061; col[4]=0x0A1; col[5]=0x111; col[6]=0x0FE; break;
      case 'I': col[0]=0x000; col[1]=0x101; col[2]=0x101; col[3]=0x1FF; col[4]=0x101; col[5]=0x101; col[6]=0x000; break;
      case 'O': col[0]=0x0FE; col[1]=0x101; col[2]=0x101; col[3]=0x101; col[4]=0x101; col[5]=0x101; col[6]=0x0FE; break;
      case 'G': col[0]=0x0FE; col[1]=0x101; col[2]=0x101; col[3]=0x121; col[4]=0x121; col[5]=0x121; col[6]=0x0FE; break;
      case 'H': col[0]=0x1FF; col[1]=0x010; col[2]=0x010; col[3]=0x010; col[4]=0x010; col[5]=0x010; col[6]=0x1FF; break;
      case 'P': col[0]=0x1FF; col[1]=0x011; col[2]=0x011; col[3]=0x011; col[4]=0x011; col[5]=0x011; col[6]=0x00E; break;
      case 'W': col[0]=0x1FF; col[1]=0x040; col[2]=0x020; col[3]=0x010; col[4]=0x020; col[5]=0x040; col[6]=0x1FF; break;
      default:  col[0]=0;     col[1]=0;     col[2]=0;     col[3]=0;     col[4]=0;     col[5]=0;     col[6]=0;     break;
     }
   for(int c = 0; c < 7; c++)
      for(int row = 0; row < 9; row++)
         if(((col[c] >> row) & 1) != 0)
            for(int sy = 0; sy < scale; sy++)
               for(int sx = 0; sx < scale; sx++)
                  SetPixel(pixels, sz, x + c*scale + sx, y + row*scale + sy, ALPHA(230, r, g, b));
  }

void DrawTextBitmap(uint &pixels[], int sz, int cx, int y,
                    string text, uint r, uint g, uint b, int scale)
  {
   int len    = StringLen(text);
   int charW  = 7*scale + scale;
   int totalW = len * charW - scale;
   int startX = cx - totalW / 2;
   for(int i = 0; i < len; i++)
      DrawCharBitmap(pixels, sz, startX + i*charW, y, (uchar)StringGetCharacter(text, i), r, g, b, scale);
  }

//+------------------------------------------------------------------+
void DrawLine(uint &pixels[], int sz, int x0, int y0, int x1, int y1, uint clr)
  {
   int dx=MathAbs(x1-x0), sx=x0<x1?1:-1;
   int dy=-MathAbs(y1-y0), sy=y0<y1?1:-1;
   int err=dx+dy;
   while(true)
     {
      SetPixel(pixels, sz, x0, y0, clr);
      if(x0==x1 && y0==y1) break;
      int e2=2*err;
      if(e2>=dy){err+=dy; x0+=sx;}
      if(e2<=dx){err+=dx; y0+=sy;}
     }
  }

//+------------------------------------------------------------------+
uint ArcColorARGB(double pct)
  {
   if(pct < 0.333) return ALPHA(255, 220,  40,  40);
   if(pct < 0.667) return ALPHA(255, 220, 180,   0);
                   return ALPHA(255,   0, 200,  80);
  }

//+------------------------------------------------------------------+
// Retorna string curta do estado rico de um TF
string RichStateName(int state)
  {
   switch(state)
     {
      case 1: return "Alta";
      case 2: return "Pullback Alta";
      case 3: return "Baixa";
      case 4: return "Pullback Baixa";
      case 5: return "Engatando Alta";
      case 6: return "Engatando Baixa";
      default: return "Consolidacao";
     }
  }

// Retorna 1 se estado é tendência de alta, -1 se baixa, 0 se neutro/pullback/consolidacao
int RichStateDirection(int state)
  {
   if(state == 1 || state == 5) return  1;
   if(state == 3 || state == 6) return -1;
   return 0;
  }

// Descricao precisa do estado para usar nos prefixos do parecer
string TFStateDesc(int state)
  {
   switch(state)
     {
      case 1: return "em alta";
      case 3: return "em baixa";
      case 5: return "engatando alta";
      case 6: return "engatando baixa";
      case 2: return "pullback de alta";
      case 4: return "pullback de baixa";
      default: return "neutro";
     }
  }

//+------------------------------------------------------------------+
// Momento dentro de estrutura de ALTA — max ~52 chars por retorno
string MomentoEmAlta(int r2, int d0, int d1, string tf3, string tf1, string tf2)
  {
   int mom = d0 + d1;
   if(r2==1)
     {
      if(mom== 2) return tf3+" em alta, curtos confirmam — momentum forte";
      if(mom== 1)
        {
         string tfneu = (d0==0) ? tf1 : tf2;
         return tf3+" em alta, "+tfneu+" hesita — tendencia intacta";
        }
      if(mom== 0)
        {
         if(d0==0 && d1==0) return tf3+" em alta, "+tf1+"/"+tf2+" laterais";
         return tf3+" em alta, "+tf1+"/"+tf2+" divergentes";
        }
      if(mom==-1)
        {
         string tfneg = (d0==-1) ? tf1 : tf2;
         return tf3+" em alta, "+tfneg+" contra — cautela";
        }
      return tf3+" em alta, curtos em queda — aguardar";
     }
   if(r2==2)
     {
      if(mom<= 0) return "pullback no "+tf3+" com curtos vendidos";
      return "pullback no "+tf3+" absorvido — retomada possivel";
     }
   if(r2==5)
     {
      if(mom>= 1) return "engatando alta no "+tf3+", curtos confirmam";
      return "engatando alta no "+tf3+" — aguardar curtos";
     }
   if(r2==3)
     {
      if(mom<=-1) return tf3+" diverge p/ baixo — possivel pivot de baixa";
      return tf3+" divergindo p/ baixo — monitorar";
     }
   if(r2==6) return tf3+" engatando baixa — possivel esgotamento";
   if(r2==4) return "pullback de baixa no "+tf3+" — aguardar exaustao";
   // r2 neutro (0): classifica pelo momentum dos curtos
   if(mom== 2) return tf3+" neutro, "+tf1+"/"+tf2+" em alta — aguardar romper";
   if(mom== 1)
     {
      string tfp = (d0==1) ? tf1 : tf2;
      return tf3+" neutro, "+tfp+" em alta — pressao compradora";
     }
   if(mom==-1)
     {
      string tfn = (d0==-1) ? tf1 : tf2;
      return tf3+" neutro, "+tfn+" vendido — pressao contraria";
     }
   if(mom==-2) return tf3+" neutro, curtos em baixa — pressao contraria";
   if(d0==0 && d1==0) return tf3+" neutro — aguardar direcao nos curtos";
   return tf3+" neutro, "+tf1+"/"+tf2+" divergentes";
  }

// Momento dentro de estrutura de BAIXA — max ~52 chars por retorno
string MomentoEmBaixa(int r2, int d0, int d1, string tf3, string tf1, string tf2)
  {
   int mom = d0 + d1;
   if(r2==3)
     {
      if(mom==-2) return tf3+" em baixa, curtos confirmam — momentum forte";
      if(mom==-1)
        {
         string tfneu = (d0==0) ? tf1 : tf2;
         return tf3+" em baixa, "+tfneu+" hesita — tendencia intacta";
        }
      if(mom== 0)
        {
         if(d0==0 && d1==0) return tf3+" em baixa, "+tf1+"/"+tf2+" laterais";
         return tf3+" em baixa, "+tf1+"/"+tf2+" divergentes";
        }
      if(mom== 1)
        {
         string tfpos = (d0==1) ? tf1 : tf2;
         return tf3+" em baixa, "+tfpos+" contra — cautela";
        }
      return tf3+" em baixa, curtos subindo — aguardar";
     }
   if(r2==4)
     {
      if(mom>= 0) return "pullback no "+tf3+" com curtos comprando";
      return "pullback no "+tf3+" absorvido — queda possivel";
     }
   if(r2==6)
     {
      if(mom<=-1) return "engatando baixa no "+tf3+", curtos confirmam";
      return "engatando baixa no "+tf3+" — aguardar curtos";
     }
   if(r2==1)
     {
      if(mom>= 1) return tf3+" diverge p/ cima — possivel pivot de alta";
      return tf3+" divergindo p/ cima — monitorar";
     }
   if(r2==5) return tf3+" engatando alta — possivel esgotamento da queda";
   if(r2==2) return "pullback de alta no "+tf3+" — aguardar exaustao";
   // r2 neutro (0): classifica pelo momentum dos curtos
   if(mom==-2) return tf3+" neutro, "+tf1+"/"+tf2+" em baixa — aguardar romper";
   if(mom==-1)
     {
      string tfn = (d0==-1) ? tf1 : tf2;
      return tf3+" neutro, "+tfn+" em baixa — pressao vendedora";
     }
   if(mom== 1)
     {
      string tfp = (d0==1) ? tf1 : tf2;
      return tf3+" neutro, "+tfp+" comprando — pressao contraria";
     }
   if(mom== 2) return tf3+" neutro, curtos em alta — pressao contraria";
   if(d0==0 && d1==0) return tf3+" neutro — aguardar direcao nos curtos";
   return tf3+" neutro, "+tf1+"/"+tf2+" divergentes";
  }

// Momento com macro indefinido — max ~52 chars por retorno
string MomentoMacroNeutro(int r2, int d0, int d1, string tf3, string tf1, string tf2)
  {
   int mom = d0 + d1;
   if(r2==1)
     {
      if(mom>= 1) return tf3+" em alta, curtos confirmam — viés comprador";
      if(mom== 0)
        {
         if(d0==0 && d1==0) return tf3+" em alta, curtos parados — aguardar";
         return tf3+" em alta, curtos divergentes — aguardar";
        }
      return tf3+" em alta, curtos vendidos — possivel pivot alta";
     }
   if(r2==3)
     {
      if(mom<=-1) return tf3+" em baixa, curtos confirmam — viés vendedor";
      if(mom== 0)
        {
         if(d0==0 && d1==0) return tf3+" em baixa, curtos parados — aguardar";
         return tf3+" em baixa, curtos divergentes — aguardar";
        }
      return tf3+" em baixa, curtos comprando — possivel pivot baixa";
     }
   if(r2==5)
     {
      if(mom>= 1) return tf3+" engatando alta, curtos a favor";
      return tf3+" engatando alta — aguardar curtos";
     }
   if(r2==6)
     {
      if(mom<=-1) return tf3+" engatando baixa, curtos a favor";
      return tf3+" engatando baixa — aguardar curtos";
     }
   if(r2==2)
     {
      if(mom<=-1) return "pullback no "+tf3+", curtos vendidos — sem direcao";
      return "pullback no "+tf3+" — mercado sem definicao";
     }
   if(r2==4)
     {
      if(mom>= 1) return "pullback baixa no "+tf3+", curtos compram — sem dir.";
      return "pullback de baixa no "+tf3+" — sem definicao";
     }
   // r2 neutro (0): classifica pelo momentum dos curtos
   if(mom== 2) return tf1+"/"+tf2+" em alta, sem respaldo no "+tf3+" — fraco";
   if(mom== 1)
     {
      string tfp = (d0==1) ? tf1 : tf2;
      return tfp+" em alta, "+tf3+" neutro — aguardar confirmacao";
     }
   if(mom==-1)
     {
      string tfn = (d0==-1) ? tf1 : tf2;
      return tfn+" em baixa, "+tf3+" neutro — aguardar confirmacao";
     }
   if(mom==-2) return tf1+"/"+tf2+" em baixa, sem respaldo no "+tf3+" — fraco";
   if(d0==0 && d1==0) return "todos os TFs neutros — aguardar direcao";
   return tf3+" neutro, "+tf1+"/"+tf2+" divergentes — sem direcao";
  }

//+------------------------------------------------------------------+
void UpdateAnalysis()
  {
   int r0=richState[0], r1=richState[1], r2=richState[2],
       r3=richState[3], r4=richState[4];

   int d0=RichStateDirection(r0), d1=RichStateDirection(r1),
       d2=RichStateDirection(r2), d3=RichStateDirection(r3),
       d4=RichStateDirection(r4);

   int mom = d0 + d1;

   string tf1=TFToString(TFs[0]), tf2=TFToString(TFs[1]),
          tf3=TFToString(TFs[2]), tf4=TFToString(TFs[3]),
          tf5=TFToString(TFs[4]);

   string text;
   color  clr;

   // ═══════════════════════════════════════════════════
   // SUPER TENDENCIA — todos os TFs em Alta ou Baixa pura
   // ═══════════════════════════════════════════════════
   int nAlta=0, nBaixa=0;
   int rs[5]; rs[0]=r0;rs[1]=r1;rs[2]=r2;rs[3]=r3;rs[4]=r4;
   for(int i=0;i<5;i++) { if(rs[i]==1) nAlta++; if(rs[i]==3) nBaixa++; }

   if(nAlta == 5)
     { text="Super tendencia de alta — todos os tempos alinhados, forca maxima"; clr=clrLime; }
   else if(nBaixa == 5)
     { text="Super tendencia de baixa — todos os tempos alinhados, forca maxima"; clr=clrRed; }

   // ═══════════════════════════════════════════════════════════════
   // CASCATA TOP-DOWN: TF5 → TF4 → (TF3 + TF1/TF2)
   // Prefixo usa TFStateDesc: reflete o estado exato (nunca "em alta" quando e "engatando")
   // TF5 neutro/pullback = "Macro indefinido"
   // ═══════════════════════════════════════════════════════════════

   // --- TF5 com viés de ALTA (Em Alta ou Engatando Alta) ---
   else if(d4 == 1)
     {
      string pfx5 = tf5+" "+TFStateDesc(r4);
      if(d3 == 1)
        {
         text = pfx5+", "+tf4+" "+TFStateDesc(r3)+" — "
                + MomentoEmAlta(r2,d0,d1,tf3,tf1,tf2);
         clr = (d2==1 && mom>=0) ? clrLime : (mom<=-1) ? clrYellow : C'180,255,100';
        }
      else if(d3 == -1)
        {
         text = pfx5+", "+tf4+" "+TFStateDesc(r3)+" — "
                + MomentoEmAlta(r2,d0,d1,tf3,tf1,tf2);
         clr = (mom<=-1) ? clrYellow : C'200,200,80';
        }
      else
        {
         text = pfx5+", "+tf4+" "+TFStateDesc(r3)+" — "
                + MomentoEmAlta(r2,d0,d1,tf3,tf1,tf2);
         clr = (d2==1 && mom>=1) ? C'180,255,100' : clrYellow;
        }
     }

   // --- TF5 com viés de BAIXA (Em Baixa ou Engatando Baixa) ---
   else if(d4 == -1)
     {
      string pfx5b = tf5+" "+TFStateDesc(r4);
      if(d3 == -1)
        {
         text = pfx5b+", "+tf4+" "+TFStateDesc(r3)+" — "
                + MomentoEmBaixa(r2,d0,d1,tf3,tf1,tf2);
         clr = (d2==-1 && mom<=0) ? clrRed : (mom>=1) ? clrYellow : C'255,120,60';
        }
      else if(d3 == 1)
        {
         text = pfx5b+", "+tf4+" "+TFStateDesc(r3)+" — "
                + MomentoEmBaixa(r2,d0,d1,tf3,tf1,tf2);
         clr = (mom>=1) ? clrYellow : C'255,160,80';
        }
      else
        {
         text = pfx5b+", "+tf4+" "+TFStateDesc(r3)+" — "
                + MomentoEmBaixa(r2,d0,d1,tf3,tf1,tf2);
         clr = (d2==-1 && mom<=-1) ? C'255,120,60' : clrYellow;
        }
     }

   // --- TF5 neutro/pullback (macro indefinido) ---
   else
     {
      string pfx = "Macro indef., "+tf4+" "+TFStateDesc(r3);
      if(d3 == 1)
        {
         text = pfx+" — "+MomentoMacroNeutro(r2,d0,d1,tf3,tf1,tf2);
         clr = (d2==1 && mom>=1) ? C'200,230,80' : clrYellow;
        }
      else if(d3 == -1)
        {
         text = pfx+" — "+MomentoMacroNeutro(r2,d0,d1,tf3,tf1,tf2);
         clr = (d2==-1 && mom<=-1) ? C'255,160,80' : clrYellow;
        }
      else
        {
         text = pfx+" — "+MomentoMacroNeutro(r2,d0,d1,tf3,tf1,tf2);
         clr = clrGold;
        }
     }

   // Quebra no " — " para distribuir em duas linhas
   string line1 = text, line2 = "";
   int sep = StringFind(text, " — ");
   if(sep >= 0)
     {
      line1 = StringSubstr(text, 0, sep);
      line2 = StringSubstr(text, sep + 3);
     }

   ObjectSetString(ChartID(),  ObjPrefix+"Analysis1", OBJPROP_TEXT,   line1);
   ObjectSetInteger(ChartID(), ObjPrefix+"Analysis1", OBJPROP_COLOR,  clr);
   ObjectSetInteger(ChartID(), ObjPrefix+"Analysis1", OBJPROP_ANCHOR, ANCHOR_LEFT_LOWER);

   ObjectSetString(ChartID(),  ObjPrefix+"Analysis2", OBJPROP_TEXT,   line2);
   ObjectSetInteger(ChartID(), ObjPrefix+"Analysis2", OBJPROP_COLOR,  clr);
   ObjectSetInteger(ChartID(), ObjPrefix+"Analysis2", OBJPROP_ANCHOR, ANCHOR_LEFT_LOWER);
  }

void UpdateSignalLabel(int idx, int signal)
  {
   int unused = signal + idx;
   unused = 0;
  }

//+------------------------------------------------------------------+
void ObjRectLL(string name, int x, int y, int w, int h,
               color bgClr, color borderClr, bool back)
  {
   if(ObjectFind(ChartID(), name) >= 0) return;
   ObjectCreate(ChartID(), name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(ChartID(), name, OBJPROP_XDISTANCE,   x);
   ObjectSetInteger(ChartID(), name, OBJPROP_YDISTANCE,   y);
   ObjectSetInteger(ChartID(), name, OBJPROP_XSIZE,       w);
   ObjectSetInteger(ChartID(), name, OBJPROP_YSIZE,       h);
   ObjectSetInteger(ChartID(), name, OBJPROP_CORNER,      CORNER_LEFT_LOWER);
   ObjectSetInteger(ChartID(), name, OBJPROP_BGCOLOR,     bgClr);
   ObjectSetInteger(ChartID(), name, OBJPROP_COLOR,       borderClr);
   ObjectSetInteger(ChartID(), name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(ChartID(), name, OBJPROP_SELECTABLE,  false);
   ObjectSetInteger(ChartID(), name, OBJPROP_BACK,        back);
  }

void ObjButtonLL(string name, string text, int x, int y, int w, int h,
                 color bgClr, color txtClr)
  {
   if(ObjectFind(ChartID(), name) >= 0) return;
   ObjectCreate(ChartID(), name, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(ChartID(), name, OBJPROP_XDISTANCE,  x);
   ObjectSetInteger(ChartID(), name, OBJPROP_YDISTANCE,  y);
   ObjectSetInteger(ChartID(), name, OBJPROP_XSIZE,      w);
   ObjectSetInteger(ChartID(), name, OBJPROP_YSIZE,      h);
   ObjectSetInteger(ChartID(), name, OBJPROP_CORNER,     CORNER_LEFT_LOWER);
   ObjectSetInteger(ChartID(), name, OBJPROP_COLOR,      txtClr);
   ObjectSetInteger(ChartID(), name, OBJPROP_BGCOLOR,    bgClr);
   ObjectSetInteger(ChartID(), name, OBJPROP_FONTSIZE,   9);
   ObjectSetString(ChartID(),  name, OBJPROP_FONT,       "Arial Bold");
   ObjectSetString(ChartID(),  name, OBJPROP_TEXT,       text);
   ObjectSetInteger(ChartID(), name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(ChartID(), name, OBJPROP_BACK,       false);
  }

void ObjLabelLL(string name, string text, int x, int y,
                color clr, int fontSize, int anchor)
  {
   if(ObjectFind(ChartID(), name) >= 0) return;
   ObjectCreate(ChartID(), name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(ChartID(), name, OBJPROP_XDISTANCE,  x);
   ObjectSetInteger(ChartID(), name, OBJPROP_YDISTANCE,  y);
   ObjectSetInteger(ChartID(), name, OBJPROP_CORNER,     CORNER_LEFT_LOWER);
   ObjectSetInteger(ChartID(), name, OBJPROP_ANCHOR,     anchor);
   ObjectSetInteger(ChartID(), name, OBJPROP_COLOR,      clr);
   ObjectSetInteger(ChartID(), name, OBJPROP_FONTSIZE,   fontSize);
   ObjectSetString(ChartID(),  name, OBJPROP_FONT,       "Arial Bold");
   ObjectSetString(ChartID(),  name, OBJPROP_TEXT,       text);
   ObjectSetInteger(ChartID(), name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(ChartID(), name, OBJPROP_BACK,       false);
  }

//+------------------------------------------------------------------+
string TFToString(ENUM_TIMEFRAMES tf)
  {
   switch(tf)
     {
      case PERIOD_M1:  return "M1";
      case PERIOD_M5:  return "M5";
      case PERIOD_M15: return "M15";
      case PERIOD_M30: return "M30";
      case PERIOD_H1:  return "H1";
      case PERIOD_H4:  return "H4";
      case PERIOD_H8:  return "H8";
      case PERIOD_H12: return "H12";
      case PERIOD_D1:  return "D1";
      case PERIOD_W1:  return "W1";
      case PERIOD_MN1: return "MN";
      default:         return "?";
     }
  }
//+------------------------------------------------------------------+