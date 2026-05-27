//+------------------------------------------------------------------+
//|                        Fate Changer.mq5                          |
//|                        Copyright 2025, Tradexperience            |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, Del Lopes."
#property link      "https://www.tradexperience.com.br"
#property version   "1.00"
#property description "Painel com envio ordens e automações."
#property description "Novidade:"
#property description "- Metas de gain e loss."
#resource "Logofatechanger.bmp"                                  // Logofatechanger - Logofatechanger.bmp
string  InpPanelTitle = " Osher Hand";           // Título do Painel


//+------------------------------------------------------------------+
//| Input Variables                                                  |
//+------------------------------------------------------------------+
input group "Meta do Dia";
input double                Meta_Global                = 1000000;    // Alvo de Saldo para o dia
input group "";
input group "Take and Stops";
input int                   _take_Inicial              = 2500;    // Take Profit 1 em pontos 
input int                   _take_Inicial2             = 5000;    // Take Profit 2 em pontos
input bool                  _AllowMarketBuy2           = true;  // Permitir 2ª entrada de compra a mercado
input bool                  _AllowMarketSell2          = true;  // Permitir 2ª entrada de venda a mercado
input int                   _StopInicial               = 2500 ; // Stop Loss em pontos
input int                   _EntradaInicial            = 250 ;    // Distância de preço para colocar
input group "";
input group "Gestão de Risco";
input double                _LoteInicial               = 0.01;    // Lote 1
input double                _LoteTwo                   = 0.05;    // Lote 2
input double                _LoteThree                 = 0.10;    // Lote 3
input group   "";
input int                   _ValueAutomaticProtect     = 10000000;      // Trava da Primeira Exposição Negativa
input int                   _ValueAutomaticProtectTwo  = 15000000;      // Trava da Segunda Exposição Negativa
input int                   CutLoss                    = 2000000;      // Cortar perdas
input double                Limite_Loss                = 5000000;      // Perda máxima para o dia
input int                   CutGain                    = 1000000;      // Realizar lucro flutuante
input group "";
input group "Gerenciamento Automático de Stop";
input group "";
input group "Trailing Avg";
input bool                  _AllowTrailingAvg          = false;    // Liga e desliga o Trailing Stop para pontos
input int                   _TrailingTriggerAvg        = 250;      // Distância de ganho do preço médio para iniciar
input int                   _TrailingPointsAvg         = 200;      // Distância do stop para o preço atual
input group "";
input group "Trailing Stop pts";
input bool                  _AllowTrailing             = false;    // Liga e desliga o Trailing Stop para pontos
input int                   _TrailingTrigger           = 280;     // Distância de ganho do preço da ordem para iniciar
input int                   _TrailingPoints            = 200;     // Distância do stop para o preço atual
input group "";
input group "Break Even avg price";
input bool                  _AllowBreakEvenAvg         = false;    // Liga e desliga o Break Even no preço médio
input int                   _BreakEvenTriggerAvg       = 250;    // Distância para ligar o Break Even
input int                   _StopGainBreakEven         = 50;      // Margem de Ganho do Preço Médio (pontos)
input group "";
input group "Break Even pts";
input bool                  _AllowBreakEven            = false;    // Liga e desliga Break Even de pontos
input int                   _BreakEvenTrigger          = 100;      // Distância pra ligar o Break Even
input int                   _StopGainBreakEvenPts      = 200;      // Margem de gain (pontos)
input group "";
input group "Automatic Leverage";
input group "";
input group               "Add - Points";
input bool                  _AllowAdd                  = false; // Liga e desliga o Add
input double                _LoteAdd                   = 0.01;    // Lote Alavancagem
input int                   _AddTriggerAvg             = 250;    // Distância para iniciar
input int                   _AddPointsAvg              = 300;    // Distância para manter do preço médio
input group "";
input group               "Addc - Candle ";
input bool                  _AllowAddc                 = false; // Liga e desliga o Add Candle
input double                _LoteAddc                  = 0.01;    // Lote Alavancagem
input int                   _CandleEdge                = 1;      // Vela de Referência - 0 para vela atual, 1 para última, 2 3 4...
input int                   _FolgaStopAddc             = 40;    // Folga Max/min da borda da vela para o preço médio
input int                   _AddcPointsAvg             = 300;    // Distância Mínima para manter do preço médio
input group "";
input group               "Grid à Favor";
input bool                  _AllowGridAhead            = false;    // Liga e desliga grid a favor
input double                _distanceAhead             = 550;      // distância inicial (Points)
input double                _multiplicatorAhead        = 1.1;      // Multiplicador de lote (linear)
input group               "Grid Contra";
input bool                  _AllowGrid                 = false;    // Liga e desliga grid contra
input double                _LoteAddGrid               = 0.01;     // Lote Base para o multiplicador
input double                _distance                  = 1000;     // distância entre as ordens
input double                _multiplicator             = 1.1;      // Multiplicador de lote (linear)
input int                   _maxLevel                  = 40;       // Máximo de ordens
input group "";
input group "Atualização de Stop e Entrada Barra-a-Barra";
input int                   _FolgaStop                 = 50;            // Folga Max/min no trailing stop de barra a barra
input bool                  _AllowTrailingBar          = false;          // Liga e Desliga Trailing Stop de Barra
input ENUM_TIMEFRAMES       _TimeframeBarStop          = PERIOD_CURRENT; // Timeframe do Trailing Stop Barra-a-Barra
input bool                  _RefreshEntry              = false;          // Liga e Desliga Atualizar Entrada
input group   "Keyboard shortcuts";
input group   "";
input group   "Num Pad";
input string  _CloseAllBuy             = "1";    // Fecha todas as Compras
input string  _MoveBuyStopsBreakEven   = "2";    // Stops de Compra no ponto de equilíbrio (Break Even)
input string  _CloseAllSell            = "3";    // Fecha todas as Vendas
input string  _Buy                     = "4";    // Compra a Mercado
input string  _Sell                    = "6";    // Venda a Mercado
input string  _CloseAllBuyPositive     = "7";    // Fecha todas as Compras Positivas
input string  _MoveSellStopsBreakEven  = "8";    // Stops de Venda no ponto de equilíbrio (Break Even)
input string  _CloseAllSellPositive    = "9";    // Fecha todas as Vendas Positivas
input string  _IsTrailingStopAutomatic = "0";    // Liga/Desliga Trailing Stop
input string  _LoteChanger             = "/";    // Alterna entre lotes 1, 2 e 3.
input string  _Even                    = ",";    // Liga e Desliga BreakEven Automático.
input string  _Add                     = "*";    // Liga e Desliga Add Automático.
input group "Regular Keyboard";
input string  _SellPositionsAtLastHigh = "q";    // Stops de Venda na última máxima
input string  _BuyPositionsAtLastLow   = "a";    // Stops de Compra na última mínima
input string  _CloseGreaterProfitBuy   = "w";    // Fecha Compra mais positiva
input string  _CloseGreaterProfitSell  = "s";    // Fecha Venda mais positiva
input string  _CloseAll                = "x";    // Fecha todas as posições
input string  _Grid                    = "g";    // Liga e Desliga Grid Automático.
input string  _ChangeHands             = "b";    // Inverter posição
input string  _CloseAllPositive        = "h";    // Fecha todas as posições Positivas
input string  _KeyAutomaticProtect     = "m";    // Liga/Desliga primeira e segunda trava de exposição
input string  _Panic                   = "p";    // Botão de resgate "Pânico".
input string  _CoverVolume             = "=";    // Travar exposição manualmente
input string  _Bxb                     = "[";    // Liga e Desliga Trailing Automático por Vela.
input string  _Addc                    = "]";    // Liga e Desliga Add Candle Automático.
input group "";
input group "Parâmetros de leitura de tendência";
input group "";
input group "Fractal Menor";
input int                   periodo_media_low          = 8;              // Períodos da Média Móvel Baixa
input ENUM_TIMEFRAMES       TimeFrameMediaLow          = PERIOD_CURRENT; // TimeFrame da Média Móvel Baixa
input ENUM_MA_METHOD        TipoMediaLow               = MODE_SMA;       // Tipo da Média Móvel   
input int                   periodo_media_high         = 8;              // Períodos da Média Móvel Alta
input ENUM_TIMEFRAMES       TimeFrameMediaHigh         = PERIOD_CURRENT; // TimeFrame da Média Móvel Alta
input ENUM_MA_METHOD        TipoMediaHigh              = MODE_SMA;       // Tipo da Média Móvel   
input int                   periodo_media_lenta        = 34;             // Períodos da Média Móvel Lenta
input ENUM_TIMEFRAMES       TimeFrameMediaLenta        = PERIOD_CURRENT; // TimeFrame da Média Móvel Lenta
input ENUM_MA_METHOD        TipoMediaLenta             = MODE_SMA;       // Tipo da Média Móvel
input int                   InpAdxPeriod               = 8;              // Período do ADX
input ENUM_TIMEFRAMES       TimeFrameAdx               = PERIOD_CURRENT; // TimeFrame do ADX
input group "";
input group "Fractal Maior";
input int                   periodo_media_low_macro    = 8;              // Períodos da Média Móvel Baixa
input ENUM_TIMEFRAMES       TimeFrameMediaLow_macro    = PERIOD_CURRENT; // TimeFrame da Média Móvel Baixa
input ENUM_MA_METHOD        TipoMediaLow_macro         = MODE_SMA;       // Tipo da Média Móvel   
input int                   periodo_media_high_macro   = 8;              // Períodos da Média Móvel Alta
input ENUM_TIMEFRAMES       TimeFrameMediaHigh_macro   = PERIOD_CURRENT; // TimeFrame da Média Móvel Alta
input ENUM_MA_METHOD        TipoMediaHigh_macro        = MODE_SMA;       // Tipo da Média Móvel   
input int                   periodo_media_lenta_macro  = 200;            // Períodos da Média Móvel Lenta
input ENUM_TIMEFRAMES       TimeFrameMediaLenta_macro  = PERIOD_CURRENT; // TimeFrame da Média Móvel Lenta
input ENUM_MA_METHOD        TipoMediaLenta_macro       = MODE_SMA;       // Tipo da Média Móvel 
input int                   InpAdxPeriodMacro          = 8;              // Período do ADX   
input ENUM_TIMEFRAMES       TimeFrameAdxMacro          = PERIOD_CURRENT; // TimeFrame do ADX
input group "";
input group "Candle Timer";
input color ValuesPositiveColor = clrWhite;                               // Cor do Timer
input color ValuesNegativeColor = clrCoral;                               // Segunda cor do timer
input int   TimeFontSize        = 13;                                    // Tamanho do Timer    
input int   TimerShift          = 1;                                     // Posição do Timer
input group "Parâmetros Gerais";
input bool _allowBuy             = false;                                 // Negociação automática Long?
input bool _allowSell            = false;                                 // Negociação automática Short?
input group "Período de operação";
input int _hourStart     = 0;                                             // Hora de Início (0-24)
input int _minuteStart   = 1;                                             // Minuto de Início (0-59)
input int _hourEnd       = 23;                                            // Hora de Fim (0-24h)
input int _minuteEnd     = 59;                                            // Minuto de Fim (0-59)
input int  _maxSpread    = 100;                                             // Spread Máximo permitido
input group "";
input int Magic_Number   = 0231;                                          //Numero de Identidade do robô

input group "Trader AFK - Hand Bot Sync";
input string ApiKey      = "";    // Chave de API gerada no app Trader AFK
input int    SyncIntervalSec = 60; // Intervalo de verificação de sync (segundos)

//+------------------------------------------------------------------+
//| Global Variables                                                 |
//+------------------------------------------------------------------+


int InpPanelWidth = 390;                                      // Panel width in pixels 
int InpPanelheight = 480;                                     // panel height in pixels
int InpPanelFontSize = 10;                                    // panel font size
color InpPanelFontColor = clrWhiteSmoke;                      // panel text color
//--------- Gerais ----------------------------------------------------
MqlDateTime timeNow;
MqlRates rates[];
datetime time_novo_candle;
int _HourCheck = 2;
int _MinCheckStart = 15;
int _MinCheckEnd = 18;
//--------- Funções ----------------------------------------------------
double saldo_inicial;
double saldo_zeragem = 0;
double contador_zeragem;
double AccountBalance;
double AccountEquity;
double _Lote = _LoteInicial;
bool DailyGain;
bool MetaProva;
bool DailyLoss = false; 
//--------- Painel ----------------------------------------------------
bool ChaveGeralKey = true;
bool _PanelBreakEvenAvg = _AllowBreakEvenAvg;
bool _PanelTrailingAvg = _AllowTrailingAvg;
bool _PanelTrailingBuy = true;
bool _PanelTrailingSell = true;
bool ButtonTwoKey = false;
double _BuyLote = 0;
double _SellLote = 0;
//Automatic protect
bool isAutomaticProtect = true;
double protectionlevel = 1;
//Trailing Stop
bool isKeyCutPositions = false;
bool _leverage = _AllowGrid;
bool _AddKey = _AllowAdd;
bool _Addckey = _AllowAddc;
bool _BarStop = _AllowTrailingBar;

// ── Variáveis espelho para parâmetros remotos (Hand Bot Sync) ─────────────
// Inicializadas com os valores dos inputs; sobrescritas pelo poll do Supabase.
bool   _RemoteAllowBuy              = _allowBuy;
bool   _RemoteAllowSell             = _allowSell;
bool   _RemoteTrailingAvgEnabled    = _AllowTrailingAvg;
int    _RemoteTrailingAvgDistance   = _TrailingTriggerAvg;
int    _RemoteTrailingAvgStop       = _TrailingPointsAvg;
bool   _RemoteTrailingPtsEnabled    = _AllowTrailing;
int    _RemoteTrailingPtsDistance   = _TrailingTrigger;
int    _RemoteTrailingPtsStop       = _TrailingPoints;
bool   _RemoteBreakEvenAvgEnabled   = _AllowBreakEvenAvg;
int    _RemoteBreakEvenAvgDistance  = _BreakEvenTriggerAvg;
int    _RemoteBreakEvenAvgGain      = _StopGainBreakEven;
bool   _RemoteBreakEvenPtsEnabled   = _AllowBreakEven;
int    _RemoteBreakEvenPtsDistance  = _BreakEvenTrigger;
int    _RemoteBreakEvenPtsGain      = _StopGainBreakEvenPts;
bool   _RemoteAddEnabled            = _AllowAdd;
double _RemoteAddLot                = _LoteAdd;
int    _RemoteAddDistance           = _AddTriggerAvg;
int    _RemoteAddAvgDistance        = _AddPointsAvg;
bool   _RemoteGridAheadEnabled      = _AllowGridAhead;
double _RemoteGridAheadDistance     = _distanceAhead;
double _RemoteGridAheadMultiplier   = _multiplicatorAhead;
bool   _RemoteGridContraEnabled     = _AllowGrid;
double _RemoteGridContraLot         = _LoteAddGrid;
double _RemoteGridContraDistance    = _distance;
double _RemoteGridContraMultiplier  = _multiplicator;
int    _RemoteGridContraMaxOrders   = _maxLevel;
int    _RemoteBarFolgaStop          = _FolgaStop;
bool   _RemoteBarTrailingEnabled    = _AllowTrailingBar;
int    _RemoteBarTimeframe          = (int)_TimeframeBarStop;
bool   _RemoteBarRefreshEntry       = _RefreshEntry;

bool   _RemoteParamsLoaded          = false; // true após primeiro poll bem-sucedido
int    _SyncTickCounter             = 0;     // conta ticks do OnTimer (cada 3s)
string _CachedLinkId                = "";    // handbot_link_id cacheado para PostgREST
int    _SyncErrorCount              = 0;     // erros consecutivos no CheckNeedsSync
// ─────────────────────────────────────────────────────────────────────────────

string ChaveGeral = "ON";
string H4Signal = "Unidentified";
string HorarioTrade = "Closed market";
//--------- Leitura de Candle ------------------------------------------
double OpenMicro[];                            // abertura no timeframe atual
double HighMicro[];                            // Máxima no timeframe atual
double LowMicro[];                             // mínima no timeframe atual
double CloseMicro[];                           // close no timeframe atual
double OpenMacro[];                            // abertura no timeframe determinado no setup
//--------- Indicadores -----------------------------------------------
double valor_media_high[];                     // média calculada com as máximas do timeframe atual
double valor_media_lenta[];                    // média lenta do timeframe atual
double valor_media_low[];                      // média calculada com as mínimas do timeframe atual
double valor_media_high_macro[];               // média calculada com as máximas do timeframe determinado no setup
double valor_media_lenta_macro[];              // média lenta do timeframe determinado no setup
double valor_media_low_macro[];                // média calculada com as mínimas do timeframe determinado no setup
double AdxMain[];                              // ADX Line
double DiMais[];                               // DI+ line
double DiMenos[];                              // DI- Line
double AdxMain_Macro[];                        // ADX Line Macro
double DiMais_Macro[];                         // DI+ line Macro
double DiMenos_Macro[];                        // DI- Line Macro
int handle_media_low = INVALID_HANDLE;         // handle da média low time frame atual
int handle_media_high = INVALID_HANDLE;        // handle da média high time frame atual
int handle_media_lenta = INVALID_HANDLE;       // handle da média lenta time frame atual
int handle_media_low_macro = INVALID_HANDLE;   // handle da média low time frame definido no setup
int handle_media_high_macro = INVALID_HANDLE;  // handle da média high time frame definido no setup
int handle_media_lenta_macro = INVALID_HANDLE; // handle da média lenta time frame definido no setup
int handle_adx = INVALID_HANDLE;               // ADX HANDLE 
int handle_adx_Macro = INVALID_HANDLE;         // ADX HANDLE Macro
//--------- Sinais --------------------------------------------------
int habilitarcompra = 0; 
int habilitarvenda = 0;
int entradadecompra = 0;
int entradadevenda = 0;
//------ Prices -----------------------------------------------------
double bid = 0;
double ask = 0;
int currentSpread;
//------ object -----------------------------------------------------
struct PositionInfo {
  int buyQuantity;
  int sellQuantity;
  };
//Digits
double volumeDigits;

//+------------------------------------------------------------------+
//| OBJECT CHARTS                                                    |
//+------------------------------------------------------------------+


//AVERAGE PRICE

#property indicator_chart_window
//--- indicator properties
#property indicator_plots 2

#property indicator_label1 "Buy Line Color"
#property indicator_type1  DRAW_SECTION
#property indicator_color1 clrLimeGreen
#property indicator_style1 STYLE_SOLID
#property indicator_width1 2

#property indicator_label2 "Sell Line Color"
#property indicator_type2  DRAW_SECTION
#property indicator_color2 clrRed
#property indicator_style2 STYLE_SOLID
#property indicator_width2 2

#property indicator_buffers 1

//---
#define DEBUG 0
#define PREFIX_AVERAGE_PRICE_LINE   "Preço Médio"
#define PREFIX_AVERAGE_PRICE_LABEL   "Lote"
#define clockName "CandleTimer" // Clock
int atrHandle; // Clock
//+------------------------------------------------------------------+
//| INCLUDES                                                         |
//+------------------------------------------------------------------+


#include <Trade\Trade.mqh>          //Instatiate Trades Execution Library
#include <Controls\Defines.mqh>     // Definições padrão para o Painel
#include <Trade\OrderInfo.mqh>      //Instatiate Library for Orders Information
#include <Trade\PositionInfo.mqh>   //Instatiate Library for Positions Information
#include <Arrays\ArrayDouble.mqh> 
#undef CONTROLS_DIALOG_COLOR_BG                       // Borda do painel
color CONTROLS_DIALOG_COLOR_BG = C'0x50,0x50,0x50';   // Borda do painel
#undef CONTROLS_DIALOG_COLOR_CAPTION_TEXT             // Borda do painel
color CONTROLS_DIALOG_COLOR_CAPTION_TEXT = clrGold;   // Borda do painel
#undef CONTROLS_DIALOG_COLOR_CLIENT_BORDER                       // sublinhado do caption
color CONTROLS_DIALOG_COLOR_CLIENT_BORDER = C'0x20,0x20,0x20';   // sublinhado do caption
#undef CONTROLS_DIALOG_COLOR_BORDER_LIGHT                        // Borda externa
color CONTROLS_DIALOG_COLOR_BORDER_LIGHT = C'0x20,0x20,0x20' ;   // Borda externa
#undef CONTROLS_DIALOG_COLOR_BORDER_DARK                         // Borda externa
color CONTROLS_DIALOG_COLOR_BORDER_DARK = C'0x20,0x20,0x20' ;    // Borda externa
#undef CONTROLS_DIALOG_COLOR_CLIENT_BG                           // BackGround do painel
#define CONTROLS_DIALOG_COLOR_CLIENT_BG C'0x20,0x20,0x20'        // BackGround do painel
#undef CONTROLS_FONT_NAME            // Fonte
#define CONTROLS_FONT_NAME          "Consolas" // Fonte
#include <Controls\Dialog.mqh>  //  panel
#include <Controls\Label.mqh>   //  panel
#include <Controls\Button.mqh>  //  panel
#include <Controls\Picture.mqh> //  panel picture

//---
CTrade         m_trade;    // Trades Info and Executions library
CTrade         Trade;      // Trades Info and Executions library
COrderInfo     m_order;    // Library for Orders information
CPositionInfo  m_position; // Library for all position features and information


//+------------------------------------------------------------------+
//| defines                                                          |
//+------------------------------------------------------------------+


//--- indents and gaps
#define INDENT_LEFT                         (11)      // indent from left (with allowance for border width)
#define INDENT_TOP                          (11)      // indent from top (with allowance for border width)
#define INDENT_RIGHT                        (11)      // indent from right (with allowance for border width)
#define INDENT_BOTTOM                       (11)      // indent from bottom (with allowance for border width)
#define CONTROLS_GAP_X                      (5)       // gap by X coordinate
#define CONTROLS_GAP_Y                      (5)       // gap by Y coordinate
//--- for buttons
#define BUTTON_WIDTH                        (100)     // size by X coordinate
#define BUTTON_HEIGHT                       (20)      // size by Y coordinate
//--- for the indication area
#define EDIT_HEIGHT                         (20)      // size by Y coordinate
//--- for group controls
#define GROUP_WIDTH                         (150)     // size by X coordinate
#define LIST_HEIGHT                         (179)     // size by Y coordinate
#define RADIO_HEIGHT                        (56)      // size by Y coordinate
#define CHECK_HEIGHT                        (93)      // size by Y coordinate


//+------------------------------------------------------------------+
//| Início Paincel - Class CControlsDialog                           |
//| Usage: main dialog of the Controls application                   |
//+------------------------------------------------------------------+


class CControlsDialog : public CAppDialog
  {   private: 
  
       //Private Variables  

       // labels
      CLabel m_lMagicc;
      CLabel m_lLots;
      CLabel m_lStart;
      CLabel m_lDuration;
      CLabel m_lmetabatida;
      CLabel m_lhorario;
      CLabel m_lsinalmacro;
      
       // Buttons

      CButton m_bFunctionOne;   // Botão de função 1        
      CButton m_bFunctionTwo;   // Botão de função 2 
      CButton m_bFunctionThree; // Botão de função 3       
      CButton m_bFunctionFour;  // Botão de função 4 
      CButton m_bFunctionFive;  // Botão de função 5       
      CButton m_bFunctionSix;   // Botão de função 6 
      CButton m_bFunctionSeven; // Botão de função 7 
      CButton m_bChangeColor;   // Botão Chave Geral
      CButton m_bFunctionEight; // Botão de função 8
      CButton m_bFunctionNine;  // Botão de função 9
      CButton m_bFunctionTen;   // Botão de função 10
      CButton m_bFunctionEleven;// Botão de função 11  
      
       // Private methods
      bool CreatePanel();
      bool CheckInputs();

      // Picture 

      CPicture m_picture; // CPicture object 
    
public:
      CControlsDialog(void);
      ~CControlsDialog(void);
      void UpdatePanel();
   //--- create
  virtual bool      Create(const long chart,const string name,const int subwin,const int x1,const int y1,const int x2,const int y2);

protected:

   //--- create dependent controls 
   bool              CreatePicture(void); 

  };
//+------------------------------------------------------------------+
//| Create the "CPanel"                                              |
//+------------------------------------------------------------------+

bool CControlsDialog::CreatePanel(void)
  {

//+----------------------------------------------------------------------------------------+
//|###################### CONTEUDO DO PAINEL ############################################# |                                          |
//+----------------------------------------------------------------------------------------+
    
    // Magic Number
    m_lMagicc.Create(NULL,"Magicc", 0,20,130,1,1);
    m_lMagicc.Text("Loading...");
    m_lMagicc.Color(InpPanelFontColor);
    m_lMagicc.FontSize(InpPanelFontSize);
    this.Add(m_lMagicc);
    
    // Spread
    m_lLots.Create(NULL,"lLots", 0,20,50,1,1);
    m_lLots.Text("Spread: "+(string)SymbolInfoInteger(Symbol(), SYMBOL_SPREAD));
    m_lLots.Color(InpPanelFontColor);
    m_lLots.FontSize(InpPanelFontSize);
    this.Add(m_lLots);
    
   // Flutuante
    m_lStart.Create(NULL,"lStart", 0,200,327,1,1);
    m_lStart.Text((string)getFloatingProfit_value());
    m_lStart.Color(InpPanelFontColor);
    m_lStart.FontSize(24);
    this.Add(m_lStart);
    
   // Lucro do dia
    m_lDuration.Create(NULL,"lMagic", 0,20,90,1,1);
    m_lDuration.Text("Daily Profit: "+(string)Lucrododia());
    m_lDuration.Color(InpPanelFontColor);
    m_lDuration.FontSize(InpPanelFontSize);
    this.Add(m_lDuration);

    // Meta
    m_lmetabatida.Create(NULL,"lmetabatida", 0,20,70,1,1);
    m_lmetabatida.Text("Goal: Loading...");
    m_lmetabatida.Color(InpPanelFontColor);
    m_lmetabatida.FontSize(InpPanelFontSize);
    this.Add(m_lmetabatida);  
 
    // Tendencia
    m_lsinalmacro.Create(NULL,"lsinalmacro", 0,20,110,1,1);
    m_lsinalmacro.Text("Trend: "+(string)H4Signal);
    m_lsinalmacro.Color(InpPanelFontColor);
    m_lsinalmacro.FontSize(InpPanelFontSize);
    this.Add(m_lsinalmacro); 
   
    // Gain Points
    m_lhorario.Create(NULL,"lhorario", 0,20,150,1,1);
    m_lhorario.Text("Loading...");
    m_lhorario.Color(clrRed);
    m_lhorario.FontSize(InpPanelFontSize);
    this.Add(m_lhorario);  

    //---------------------- Botoes -> -------------------------

    // Botão Chave Geral
    m_bChangeColor.Create(NULL,"bChangeColor", 0,264,57,316,92);
    m_bChangeColor.Text((string)ChaveGeral);
    m_bChangeColor.Color(clrWhite);
    m_bChangeColor.ColorBackground(clrDarkRed);
    m_bChangeColor.FontSize(InpPanelFontSize);
    this.Add(m_bChangeColor);  

    // Botão 7 Automatic Protection
    m_bFunctionSeven.Create(NULL,"bFunctionSeven", 0,200,372,316,395);
    m_bFunctionSeven.Text((string)isAutomaticProtect);
    m_bFunctionSeven.Color(clrWhite);
    m_bFunctionSeven.ColorBackground(clrDarkRed);
    m_bFunctionSeven.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionSeven);

    // Botão 8 Lote Change
    m_bFunctionEight.Create(NULL,"bFunctionEight", 0,264,107,316,142);
    m_bFunctionEight.Text((string)_Lote);
    m_bFunctionEight.Color(clrBlack);
    m_bFunctionEight.ColorBackground(clrWhite);
    m_bFunctionEight.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionEight);

    //---------------------- Botoes de baixo -------------------

    // Botão 5 - Buy Stop
    m_bFunctionFive.Create(NULL,"bFunctionFive", 0,45,180,145,205);
    m_bFunctionFive.Text("Buy Limit");
    m_bFunctionFive.Color(clrWhite);
    m_bFunctionFive.ColorBackground(clrForestGreen);
    m_bFunctionFive.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionFive);  

    // Botão 6 - Sell Stop
    m_bFunctionSix.Create(NULL,"bFunctionSix", 0,160,180,260,205);
    m_bFunctionSix.Text("Sell Limit");
    m_bFunctionSix.Color(clrWhite);
    m_bFunctionSix.ColorBackground(clrDarkRed);
    m_bFunctionSix.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionSix);   

    // Botão 3 - Even
    m_bFunctionThree.Create(NULL,"bFunctionThree", 0,45,215,90,245);
    m_bFunctionThree.Text("Even");
    m_bFunctionThree.Color(clrWhite);
    m_bFunctionThree.ColorBackground(clrSteelBlue);
    m_bFunctionThree.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionThree);  

    // Botão 9 Add Automático
    m_bFunctionNine.Create(NULL,"bFunctionNine", 0,100,215,145,245); 
    m_bFunctionNine.Text("Add");
    m_bFunctionNine.Color(clrWhite);
    m_bFunctionNine.ColorBackground(clrSteelBlue);
    m_bFunctionNine.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionNine);

    // Botão 1 - Trailing Avg
    m_bFunctionOne.Create(NULL,"bFunctionOne", 0,160,215,205,245);
    m_bFunctionOne.Text("Trail");
    m_bFunctionOne.Color(clrWhite);
    m_bFunctionOne.ColorBackground(clrSteelBlue);
    m_bFunctionOne.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionOne);  

    // Botão 4 - Grid
    m_bFunctionFour.Create(NULL,"bFunctionFour", 0,215,215,260,245);
    m_bFunctionFour.Text("Grid");
    m_bFunctionFour.Color(clrWhite);
    m_bFunctionFour.ColorBackground(clrSteelBlue);
    m_bFunctionFour.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionFour);  

    // Botão 10 Add Orientado pelo Candle
    m_bFunctionTen.Create(NULL,"bFunctionTen", 0,45,255,90,285); 
    m_bFunctionTen.Text("Addc");
    m_bFunctionTen.Color(clrWhite);
    m_bFunctionTen.ColorBackground(clrSteelBlue);
    m_bFunctionTen.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionTen);

    // Botão 11 Bar x Bar Stop
    m_bFunctionEleven.Create(NULL,"bFunctionEleven", 0,100,255,145,285); 
    m_bFunctionEleven.Text("BxB");
    m_bFunctionEleven.Color(clrWhite);
    m_bFunctionEleven.ColorBackground(clrSteelBlue);
    m_bFunctionEleven.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionEleven);

    // Botão 2 - Panic
    m_bFunctionTwo.Create(NULL,"bFunctionTwo", 0,160,255,260,285);
    m_bFunctionTwo.Text("Panic");
    m_bFunctionTwo.Color(clrWhite);
    m_bFunctionTwo.ColorBackground(clrSteelBlue);
    m_bFunctionTwo.FontSize(InpPanelFontSize);
    this.Add(m_bFunctionTwo);   


//--- succeed
    return(true);
  }

//+-----------------------------------------------------------------------------------------------------+
//|            ATUALIZAÇÕES DO PAINEL                                                                   |
//+-----------------------------------------------------------------------------------------------------+  

void CControlsDialog::UpdatePanel(){ // Atualiza as linhas do painel.

//-------------------- SPREAD ---------------------------  
m_lLots.Text("Spread: "+(string)SymbolInfoInteger(Symbol(), SYMBOL_SPREAD)); 
if((string)SymbolInfoInteger(Symbol(), SYMBOL_SPREAD) < (string)currentSpread ){
m_lLots.Color(clrWhiteSmoke);
currentSpread = (int)SymbolInfoInteger(Symbol(), SYMBOL_SPREAD);
}
if((string)SymbolInfoInteger(Symbol(), SYMBOL_SPREAD) > (string)currentSpread){
m_lLots.Color(clrLime);
currentSpread = (int)SymbolInfoInteger(Symbol(), SYMBOL_SPREAD);
}

//--------------------POSIÇÔES---------------------------
if(Comprado()==true && Vendido()==false){
m_lMagicc.Text("Size: Buy:"+(string)_BuyLote+" Sell: 0");
}
if(Comprado()==false && Vendido()==true){
m_lMagicc.Text("Size: Buy: 0 Sell: "+(string)_SellLote);
}
if(Comprado()==true && Vendido()==true){
m_lMagicc.Text("Size: Buy:"+(string)_BuyLote+" Sell:"+(string)_SellLote);
}
if(Posicionado() == false){
m_lMagicc.Text("Size: Buy: 0 Sell: 0");
}

//---------------- P&L -------------------------------
m_lStart.Text((string)getFloatingProfit_value());
if(getFloatingProfit_value() > 0){
m_lStart.Color(clrLime);
}
if(getFloatingProfit_value() < 0){
m_lStart.Color(clrRed);
}
if(getFloatingProfit_value() == 0){
m_lStart.Color(InpPanelFontColor);
}
//---------------Lucro do Dia ----------------------------
m_lDuration.Text("Daily Profit: "+(string)Lucrododia());
if(Lucrododia() == 0){
m_lDuration.Color(InpPanelFontColor);   
}
if(Lucrododia() > 0){
m_lDuration.Color(clrLime);   
}
if(Lucrododia() < 0){
m_lDuration.Color(clrRed);   
}
//--------------------Meta do dia ---------------------------
if(DailyLoss == false && MetaProva == false){
m_lmetabatida.Text("Goal: "+(string)Meta_Global);
m_lmetabatida.Color(InpPanelFontColor);
}
if(DailyLoss == false && MetaProva == true){
m_lmetabatida.Text((string)Meta_Global+" Achieved!");
m_lmetabatida.Color(clrLime);
}
if(DailyLoss == true){
m_lmetabatida.Text("Red Card █.");
m_lmetabatida.Color(clrRed);
}
//----------------- Status ------------------------------
if(Posicionado() == false){
 m_lhorario.Text("Points: 0");
 m_lhorario.Color(InpPanelFontColor);
 }
 if(Comprado() == true && Vendido() == false){
 double _pointsAvgBuy = NormalizeDouble((bid - getAveragePrice_Buy())*100, _Digits);
 m_lhorario.Text("Points: "+(string)_pointsAvgBuy);
  if(_pointsAvgBuy > 0 ){
    m_lhorario.Color(clrLime);}
      if(_pointsAvgBuy < 0 ){
    m_lhorario.Color(clrRed);}
  }
  if(Vendido() == true && Comprado() == false){
 double _pointsAvgSell = NormalizeDouble((getAveragePrice_Sell() - ask)*100, _Digits);
 m_lhorario.Text("Points: "+(string)_pointsAvgSell);
 if(_pointsAvgSell > 0 ){
    m_lhorario.Color(clrLime);}
      if(_pointsAvgSell < 0 ){
    m_lhorario.Color(clrRed);}
  }
 
//------------------- Tendência ----------------------------
m_lsinalmacro.Text("Trend: "+(string)H4Signal);
//------------------- on / off  ----------------------------
m_bChangeColor.Text((string)ChaveGeral);
if(ChaveGeralKey == false){
m_bChangeColor.ColorBackground(clrDarkRed);
 }
 if(ChaveGeralKey == true){
m_bChangeColor.ColorBackground(clrForestGreen);
 }
//------------------- Automatic Protecion --------------------
m_bFunctionSeven.Text((string)isAutomaticProtect);
if(isAutomaticProtect == false){
m_bFunctionSeven.ColorBackground(clrDarkRed);
m_bFunctionSeven.Text("Manual Cover");
 }
 if(isAutomaticProtect == true){
m_bFunctionSeven.Text("Auto Cover");
m_bFunctionSeven.ColorBackground(clrForestGreen);
}
//-------------- BREAK EVEN ---------------------------------
if ( _PanelBreakEvenAvg == false ){
  m_bFunctionThree.ColorBackground(clrSteelBlue);
}
if ( _PanelBreakEvenAvg == true ){
m_bFunctionThree.ColorBackground(clrForestGreen);
}
//-------------- Add ---------------------------------
if ( _AddKey == false ){
m_bFunctionNine.ColorBackground(clrSteelBlue);
}
if ( _AddKey == true ){
m_bFunctionNine.ColorBackground(clrGreen);
}
//-------------- Add Candle----------------------------
if ( _Addckey == false ){
m_bFunctionTen.ColorBackground(clrSteelBlue);
}
if ( _Addckey == true ){
m_bFunctionTen.ColorBackground(clrGreen);
}
//-------------- Bar Stop------------------------------
if ( _BarStop == false ){
m_bFunctionEleven.ColorBackground(clrSteelBlue);
}
if ( _BarStop == true ){
m_bFunctionEleven.ColorBackground(clrGreen);
}
//-------------- GRID ---------------------------------
if ( _leverage == false ){
m_bFunctionFour.ColorBackground(clrSteelBlue);
}
if ( _leverage == true ){
m_bFunctionFour.ColorBackground(clrGreen);
}
//-------------- BUY STOP ---------------------------------
if ( DailyLoss == true ){
  m_bFunctionFive.ColorBackground(clrGray);
}
if ( DailyLoss == false ){
m_bFunctionFive.ColorBackground(clrForestGreen);
}
//-------------- SELL STOP---------------------------------
if ( DailyLoss == true ){
  m_bFunctionSix.ColorBackground(clrGray);
}
if ( DailyLoss == false ){
m_bFunctionSix.ColorBackground(clrDarkRed);
}
//-------------- TRAIL ---------------------------------
if(_PanelTrailingAvg == false){
m_bFunctionOne.ColorBackground(clrSteelBlue);
}
if(_PanelTrailingAvg == true){
m_bFunctionOne.ColorBackground(clrGreen);
}
//--------------- PANIC --------------------------------
if(ButtonTwoKey == false){
m_bFunctionTwo.Text("Panic");
m_bFunctionTwo.ColorBackground(clrSteelBlue);
 }
 if(ButtonTwoKey == true){
if (contador_zeragem == 0){
  saldo_zeragem = AccountBalance;
  contador_zeragem = 1;
}
m_bFunctionTwo.Text(string(saldo_zeragem));
m_bFunctionTwo.ColorBackground(clrGreen);
if (AccountEquity > saldo_zeragem){
Close_All();
Print("Liquidated.");
if(Posicionado() == false){
ButtonTwoKey = false;
contador_zeragem = 0;
      }
    }  
 }
//--------------- Botão 8 --------------------------------
    m_bFunctionEight.Text((string)_Lote);
    if( _Lote != _LoteInicial && _Lote != _LoteTwo && _Lote != _LoteThree ) { 
    _Lote = _LoteInicial;
  Print("Lot defined for "+(string)_Lote); }
} 

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+

CControlsDialog::CControlsDialog(void)
  {
  }

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+

CControlsDialog::~CControlsDialog(void)
  {
  }

//+------------------------------------------------------------------+
//| Create                                                           |
//+------------------------------------------------------------------+

bool CControlsDialog::Create(const long chart,const string name,const int subwin,const int x1,const int y1,const int x2,const int y2)
  {
    if(!CAppDialog::Create(chart,name,subwin,x1,y1,x2,y2))
      return(false);
//--- create dependent controls
    if(!CreatePicture()) 
      return(false); 
    if(!CreatePanel())
      return(false);
    //--- create dependent controls 

//--- succeed
    return(true);
  }
  bool CControlsDialog::CheckInputs(void){

    return true;
  }

//+------------------------------------------------------------------+ 
//| Create the "Picture"                                             | 
//+------------------------------------------------------------------+ 
bool CControlsDialog::CreatePicture(void) 
  { 
//--- coordinates 
   int x1=0; 
   int y1=0; 
   int x2=x1+32; 
   int y2=y1+32; 
//--- create 
   if(!m_picture.Create(m_chart_id,m_name+"Picture",m_subwin,x1,y1,x2,y2)) 
      return(false); 
//--- definimos o nome dos arquivos bmp para exibir os controles CPicture 
   m_picture.BmpName("::Logofatechanger.bmp"); 
  
   if(!Add(m_picture)) 
      return(false); 
//--- succeed 
   return(true); 
  } 


//+------------------------------------------------------------------+
//| Global Variables                                                 |
//+------------------------------------------------------------------+


CControlsDialog ExtDialog;
//--- 
bool     pause=true;             // true - pause


//+------------------------------------------------------------------+
//| Busca o handbot_link_id via PostgREST (sem contar como invocação)|
//+------------------------------------------------------------------+

bool FetchHandbotLinkId()
{
   if(StringLen(ApiKey) < 10) return false;

   // Usa SHA-256 não está disponível em MQL5 nativamente, então passamos o
   // token Bearer direto na edge function — mas para PostgREST precisamos do
   // link_id. Fazemos uma única chamada à edge function para obtê-lo.
   string url = "https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/handbot-params/link-id";

   string headers = "Authorization: Bearer " + ApiKey + "\r\n"
                  + "Content-Type: application/json\r\n";

   char   postData[];
   char   result[];
   string responseHeaders;

   int res = WebRequest("GET", url, headers, 5000, postData, result, responseHeaders);
   if(res == -1)
   {
      Print("[HandBot] FetchLinkId falhou — adicione armhlcnmaqgudqivkpgt.supabase.co em Ferramentas→Opções→Expert Advisors.");
      return false;
   }
   if(res != 200) return false;

   string json = CharArrayToString(result);
   // Extrai "link_id":"<uuid>"
   string pattern = "\"link_id\":\"";
   int pos = StringFind(json, pattern);
   if(pos < 0) return false;
   pos += StringLen(pattern);
   int end = StringFind(json, "\"", pos);
   if(end < 0) return false;
   _CachedLinkId = StringSubstr(json, pos, end - pos);
   return StringLen(_CachedLinkId) > 0;
}

//+------------------------------------------------------------------+
//| Verifica needs_sync via PostgREST (grátis, não é edge function)  |
//| Retorna true se EA deve buscar parâmetros completos              |
//+------------------------------------------------------------------+

bool CheckNeedsSync()
{
   if(StringLen(_CachedLinkId) == 0) return true; // sem cache → força fetch

   // PostgREST: GET /rest/v1/handbot_params?handbot_link_id=eq.<id>&select=needs_sync
   string url = "https://armhlcnmaqgudqivkpgt.supabase.co/rest/v1/handbot_params"
              + "?handbot_link_id=eq." + _CachedLinkId
              + "&select=needs_sync";

   string anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybWhsY25tYXFndWRxaXZrcGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzU0MDMsImV4cCI6MjA1NzgxMTQwM30.6smSMTKlRuHVt6MO5gWQIBwhFPJr6q7J0GS-yFlhWb8";

   string headers = "apikey: " + anonKey + "\r\n"
                  + "Authorization: Bearer " + anonKey + "\r\n";

   char   postData[];
   char   result[];
   string responseHeaders;

   int res = WebRequest("GET", url, headers, 5000, postData, result, responseHeaders);
   if(res != 200)
   {
      // Erro de rede: se já temos parâmetros carregados, não força fetch
      // (evita flood de edge function invocations por instabilidade de rede)
      _SyncErrorCount++;
      return !_RemoteParamsLoaded;
   }
   _SyncErrorCount = 0;

   string json = CharArrayToString(result);
   // Resposta: [{"needs_sync":true}] ou [{"needs_sync":false}]
   return StringFind(json, "\"needs_sync\":true") >= 0;
}

//+------------------------------------------------------------------+
//| Hand Bot Sync — busca parâmetros remotos no Supabase            |
//+------------------------------------------------------------------+

void FetchHandbotParams()
{
   if(StringLen(ApiKey) < 10)
      return; // ApiKey não configurada

   string supabaseUrl = "https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/handbot-params";

   string headers = "Authorization: Bearer " + ApiKey + "\r\n"
                  + "Content-Type: application/json\r\n";

   char   postData[];
   char   result[];
   string responseHeaders;

   int res = WebRequest("GET", supabaseUrl, headers, 5000, postData, result, responseHeaders);

   if(res == -1)
   {
      Print("[HandBot] WebRequest falhou. Erro: ", GetLastError(),
            " — verifique se a URL está autorizada em Ferramentas→Opções→Expert Advisors.");
      return;
   }

   if(res != 200)
   {
      Print("[HandBot] Resposta inesperada: HTTP ", res);
      return;
   }

   string json = CharArrayToString(result);

   // needs_sync=false no servidor → sem mudanças pendentes (só acontece se veio via edge function
   // diretamente sem passar pelo CheckNeedsSync; na prática não ocorre no fluxo normal)
   if(StringFind(json, "\"sync\":false") >= 0)
      return;

   // Parser manual — extrai valores chave:valor do JSON simples
   // (sem dependência de biblioteca externa)
   #define HANDBOT_GET_BOOL(key)   (StringFind(json, "\"" + key + "\":true") >= 0)
   #define HANDBOT_GET_INT(key)    HandbotParseInt(json, key)
   #define HANDBOT_GET_DBL(key)    HandbotParseDouble(json, key)

   // Snapshot dos valores anteriores para detectar mudanças
   bool   prev_AllowBuy             = _RemoteAllowBuy;
   bool   prev_AllowSell            = _RemoteAllowSell;
   bool   prev_TrailingAvgEnabled   = _RemoteTrailingAvgEnabled;
   int    prev_TrailingAvgDistance  = _RemoteTrailingAvgDistance;
   int    prev_TrailingAvgStop      = _RemoteTrailingAvgStop;
   bool   prev_TrailingPtsEnabled   = _RemoteTrailingPtsEnabled;
   int    prev_TrailingPtsDistance  = _RemoteTrailingPtsDistance;
   int    prev_TrailingPtsStop      = _RemoteTrailingPtsStop;
   bool   prev_BreakEvenAvgEnabled  = _RemoteBreakEvenAvgEnabled;
   int    prev_BreakEvenAvgDistance = _RemoteBreakEvenAvgDistance;
   int    prev_BreakEvenAvgGain     = _RemoteBreakEvenAvgGain;
   bool   prev_BreakEvenPtsEnabled  = _RemoteBreakEvenPtsEnabled;
   int    prev_BreakEvenPtsDistance = _RemoteBreakEvenPtsDistance;
   int    prev_BreakEvenPtsGain     = _RemoteBreakEvenPtsGain;
   bool   prev_AddEnabled           = _RemoteAddEnabled;
   double prev_AddLot               = _RemoteAddLot;
   int    prev_AddDistance          = _RemoteAddDistance;
   int    prev_AddAvgDistance       = _RemoteAddAvgDistance;
   bool   prev_GridAheadEnabled     = _RemoteGridAheadEnabled;
   double prev_GridAheadDistance    = _RemoteGridAheadDistance;
   double prev_GridAheadMultiplier  = _RemoteGridAheadMultiplier;
   bool   prev_GridContraEnabled    = _RemoteGridContraEnabled;
   double prev_GridContraLot        = _RemoteGridContraLot;
   double prev_GridContraDistance   = _RemoteGridContraDistance;
   double prev_GridContraMultiplier = _RemoteGridContraMultiplier;
   int    prev_GridContraMaxOrders  = _RemoteGridContraMaxOrders;
   int    prev_BarFolgaStop         = _RemoteBarFolgaStop;
   bool   prev_BarTrailingEnabled   = _RemoteBarTrailingEnabled;
   int    prev_BarTimeframe         = _RemoteBarTimeframe;
   bool   prev_BarRefreshEntry      = _RemoteBarRefreshEntry;

   _RemoteAllowBuy             = HANDBOT_GET_BOOL("allow_buy");
   _RemoteAllowSell            = HANDBOT_GET_BOOL("allow_sell");
   _RemoteTrailingAvgEnabled   = HANDBOT_GET_BOOL("trailing_avg_enabled");
   _RemoteTrailingAvgDistance  = HANDBOT_GET_INT("trailing_avg_distance");
   _RemoteTrailingAvgStop      = HANDBOT_GET_INT("trailing_avg_stop");
   _RemoteTrailingPtsEnabled   = HANDBOT_GET_BOOL("trailing_pts_enabled");
   _RemoteTrailingPtsDistance  = HANDBOT_GET_INT("trailing_pts_distance");
   _RemoteTrailingPtsStop      = HANDBOT_GET_INT("trailing_pts_stop");
   _RemoteBreakEvenAvgEnabled  = HANDBOT_GET_BOOL("break_even_avg_enabled");
   _RemoteBreakEvenAvgDistance = HANDBOT_GET_INT("break_even_avg_distance");
   _RemoteBreakEvenAvgGain     = HANDBOT_GET_INT("break_even_avg_gain");
   _RemoteBreakEvenPtsEnabled  = HANDBOT_GET_BOOL("break_even_pts_enabled");
   _RemoteBreakEvenPtsDistance = HANDBOT_GET_INT("break_even_pts_distance");
   _RemoteBreakEvenPtsGain     = HANDBOT_GET_INT("break_even_pts_gain");
   _RemoteAddEnabled           = HANDBOT_GET_BOOL("add_points_enabled");
   _RemoteAddLot               = HANDBOT_GET_DBL("add_points_lot");
   _RemoteAddDistance          = HANDBOT_GET_INT("add_points_distance");
   _RemoteAddAvgDistance       = HANDBOT_GET_INT("add_points_avg_distance");
   _RemoteGridAheadEnabled     = HANDBOT_GET_BOOL("grid_ahead_enabled");
   _RemoteGridAheadDistance    = HANDBOT_GET_DBL("grid_ahead_distance");
   _RemoteGridAheadMultiplier  = HANDBOT_GET_DBL("grid_ahead_multiplier");
   _RemoteGridContraEnabled    = HANDBOT_GET_BOOL("grid_contra_enabled");
   _RemoteGridContraLot        = HANDBOT_GET_DBL("grid_contra_lot");
   _RemoteGridContraDistance   = HANDBOT_GET_DBL("grid_contra_distance");
   _RemoteGridContraMultiplier = HANDBOT_GET_DBL("grid_contra_multiplier");
   _RemoteGridContraMaxOrders  = HANDBOT_GET_INT("grid_contra_max_orders");
   _RemoteBarFolgaStop         = HANDBOT_GET_INT("bar_folga_stop");
   _RemoteBarTrailingEnabled   = HANDBOT_GET_BOOL("bar_trailing_enabled");
   _RemoteBarTimeframe         = HANDBOT_GET_INT("bar_timeframe");
   _RemoteBarRefreshEntry      = HANDBOT_GET_BOOL("bar_refresh_entry");

   // Sincroniza variáveis de estado (togláveis pelo teclado/painel) com os valores remotos após cada poll
   _BarStop          = _RemoteBarTrailingEnabled;
   _leverage         = _RemoteGridContraEnabled || _RemoteGridAheadEnabled;
   _AddKey           = _RemoteAddEnabled;
   _PanelTrailingAvg = _RemoteTrailingAvgEnabled;
   _PanelBreakEvenAvg = _RemoteBreakEvenAvgEnabled;

   if(!_RemoteParamsLoaded)
   {
      Print("[HandBot] Parâmetros remotos carregados com sucesso.");
      _RemoteParamsLoaded = true;
      return;
   }

   // Detecta e loga parâmetros que foram alterados no webapp
   #define HANDBOT_LOG_BOOL(label, prev, curr) if(prev != curr) Print("[HandBot] ", label, ": ", (prev ? "true" : "false"), " → ", (curr ? "true" : "false"))
   #define HANDBOT_LOG_INT(label, prev, curr)  if(prev != curr) Print("[HandBot] ", label, ": ", prev, " → ", curr)
   #define HANDBOT_LOG_DBL(label, prev, curr)  if(prev != curr) Print("[HandBot] ", label, ": ", DoubleToString(prev, 2), " → ", DoubleToString(curr, 2))

   HANDBOT_LOG_BOOL("allow_buy",               prev_AllowBuy,             _RemoteAllowBuy);
   HANDBOT_LOG_BOOL("allow_sell",              prev_AllowSell,            _RemoteAllowSell);
   HANDBOT_LOG_BOOL("trailing_avg_enabled",    prev_TrailingAvgEnabled,   _RemoteTrailingAvgEnabled);
   HANDBOT_LOG_INT ("trailing_avg_distance",   prev_TrailingAvgDistance,  _RemoteTrailingAvgDistance);
   HANDBOT_LOG_INT ("trailing_avg_stop",       prev_TrailingAvgStop,      _RemoteTrailingAvgStop);
   HANDBOT_LOG_BOOL("trailing_pts_enabled",    prev_TrailingPtsEnabled,   _RemoteTrailingPtsEnabled);
   HANDBOT_LOG_INT ("trailing_pts_distance",   prev_TrailingPtsDistance,  _RemoteTrailingPtsDistance);
   HANDBOT_LOG_INT ("trailing_pts_stop",       prev_TrailingPtsStop,      _RemoteTrailingPtsStop);
   HANDBOT_LOG_BOOL("break_even_avg_enabled",  prev_BreakEvenAvgEnabled,  _RemoteBreakEvenAvgEnabled);
   HANDBOT_LOG_INT ("break_even_avg_distance", prev_BreakEvenAvgDistance, _RemoteBreakEvenAvgDistance);
   HANDBOT_LOG_INT ("break_even_avg_gain",     prev_BreakEvenAvgGain,     _RemoteBreakEvenAvgGain);
   HANDBOT_LOG_BOOL("break_even_pts_enabled",  prev_BreakEvenPtsEnabled,  _RemoteBreakEvenPtsEnabled);
   HANDBOT_LOG_INT ("break_even_pts_distance", prev_BreakEvenPtsDistance, _RemoteBreakEvenPtsDistance);
   HANDBOT_LOG_INT ("break_even_pts_gain",     prev_BreakEvenPtsGain,     _RemoteBreakEvenPtsGain);
   HANDBOT_LOG_BOOL("add_points_enabled",      prev_AddEnabled,           _RemoteAddEnabled);
   HANDBOT_LOG_DBL ("add_points_lot",          prev_AddLot,               _RemoteAddLot);
   HANDBOT_LOG_INT ("add_points_distance",     prev_AddDistance,          _RemoteAddDistance);
   HANDBOT_LOG_INT ("add_points_avg_distance", prev_AddAvgDistance,       _RemoteAddAvgDistance);
   HANDBOT_LOG_BOOL("grid_ahead_enabled",      prev_GridAheadEnabled,     _RemoteGridAheadEnabled);
   HANDBOT_LOG_DBL ("grid_ahead_distance",     prev_GridAheadDistance,    _RemoteGridAheadDistance);
   HANDBOT_LOG_DBL ("grid_ahead_multiplier",   prev_GridAheadMultiplier,  _RemoteGridAheadMultiplier);
   HANDBOT_LOG_BOOL("grid_contra_enabled",     prev_GridContraEnabled,    _RemoteGridContraEnabled);
   HANDBOT_LOG_DBL ("grid_contra_lot",         prev_GridContraLot,        _RemoteGridContraLot);
   HANDBOT_LOG_DBL ("grid_contra_distance",    prev_GridContraDistance,   _RemoteGridContraDistance);
   HANDBOT_LOG_DBL ("grid_contra_multiplier",  prev_GridContraMultiplier, _RemoteGridContraMultiplier);
   HANDBOT_LOG_INT ("grid_contra_max_orders",  prev_GridContraMaxOrders,  _RemoteGridContraMaxOrders);
   HANDBOT_LOG_INT ("bar_folga_stop",          prev_BarFolgaStop,         _RemoteBarFolgaStop);
   HANDBOT_LOG_BOOL("bar_trailing_enabled",    prev_BarTrailingEnabled,   _RemoteBarTrailingEnabled);
   HANDBOT_LOG_INT ("bar_timeframe",           prev_BarTimeframe,         _RemoteBarTimeframe);
   HANDBOT_LOG_BOOL("bar_refresh_entry",       prev_BarRefreshEntry,      _RemoteBarRefreshEntry);

   #undef HANDBOT_LOG_BOOL
   #undef HANDBOT_LOG_INT
   #undef HANDBOT_LOG_DBL
}

// Extrai um inteiro de um JSON simples: "key":123
int HandbotParseInt(const string &json, const string key)
{
   string pattern = "\"" + key + "\":";
   int pos = StringFind(json, pattern);
   if(pos < 0) return 0;
   pos += StringLen(pattern);
   string sub = StringSubstr(json, pos, 20);
   // pega dígitos até encontrar não-dígito
   string num = "";
   for(int i = 0; i < StringLen(sub); i++)
   {
      ushort c = StringGetCharacter(sub, i);
      if(c >= '0' && c <= '9') num += ShortToString(c);
      else break;
   }
   return (int)StringToInteger(num);
}

// Extrai um double de um JSON simples: "key":0.01
double HandbotParseDouble(const string &json, const string key)
{
   string pattern = "\"" + key + "\":";
   int pos = StringFind(json, pattern);
   if(pos < 0) return 0.0;
   pos += StringLen(pattern);
   string sub = StringSubstr(json, pos, 20);
   string num = "";
   for(int i = 0; i < StringLen(sub); i++)
   {
      ushort c = StringGetCharacter(sub, i);
      if((c >= '0' && c <= '9') || c == '.' || c == '-') num += ShortToString(c);
      else break;
   }
   return StringToDouble(num);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+

int OnInit()
  {
    if(ValidateLicense(true))
      { 
        // Salva o saldo inicial    
        saldo_inicial = AccountInfoDouble(ACCOUNT_BALANCE);
           // Obter o nome do titular da conta
            string nomeTitular = AccountInfoString(ACCOUNT_NAME);
        
                
        //--- Get Current Spread
        currentSpread = (int)SymbolInfoInteger(Symbol(), SYMBOL_SPREAD);
        // -- inicia o relógio
        atrHandle = iATR(NULL,0,30);
              
        //Set MagicNumber
        Trade.SetExpertMagicNumber(Magic_Number);
        m_trade.SetExpertMagicNumber(Magic_Number);
        //Digits
        volumeDigits = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
        volumeDigits = countDecimalDigits(volumeDigits);
        
        Print("License validated. Login allowed!");
        //Carregar indicador
        if(!CarregarMedias())        
        return INIT_FAILED;
        
        //---
        EventSetTimer(3);
        pause=true;
        // Obtém link_id para PostgREST (1 invocação na inicialização, depois PostgREST grátis)
        FetchHandbotLinkId();
        // Primeiro carregamento de parâmetros remotos
        FetchHandbotParams();
        //--- create application dialog
        if(!ExtDialog.Create(0,InpPanelTitle,0,40,40,InpPanelWidth,InpPanelheight))
        return(INIT_FAILED);
        //--- run application
        ExtDialog.Run();
        //--- succeed
        return(INIT_SUCCEEDED);
      }
    else
    {
      return(INIT_FAILED);
    }
  }
//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+


void OnDeinit(const int reason)
  {
    //limpa o draw line de average price
      ObjectDelete(ChartID(), PREFIX_AVERAGE_PRICE_LINE + " de compra");
      ObjectDelete(ChartID(), PREFIX_AVERAGE_PRICE_LABEL + " de compra");
      ObjectDelete(ChartID(), PREFIX_AVERAGE_PRICE_LINE + " de venda");
      ObjectDelete(ChartID(), PREFIX_AVERAGE_PRICE_LABEL + " de venda");

    // limpar os sinais do gráfico

      ObjectDelete(ChartID(), "Sinal de Compra"+_Symbol);
      ObjectDelete(ChartID(), "Sinal de Venda - realização");
      ObjectDelete(ChartID(), "Sinal de Venda"+_Symbol);
      ObjectDelete(ChartID(), "Sinal de compra - realização");
      ObjectDelete(ChartID(), "CandleTimer");
      
       //--- clear comments
      Comment("");
      //--- destroy dialog
      ExtDialog.Destroy(reason);
      }


//-------------------------------------------------------------------+
//| Expert chart event function | Panel                              |
//+------------------------------------------------------------------+


void OnChartEvent(const int id,         // event ID  
                  const long& lparam,   // event parameter of the long type
                  const double& dparam, // event parameter of the double type
                  const string& sparam) // event parameter of the string type
  {
    ExtDialog.ChartEvent(id,lparam,dparam,sparam);
    
    // Botões de click do painel / chamar função quando apertar o botão.
    if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bChangeColor") {    // On OFF
    OnClickBotomButton();    
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionThree") {  // Botão 1

    OnClickFunctionSeven();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionFour") {  // Botão 2

    GridKey();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionFive") {  // Botão 3

    OnClickFunctionFive();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionSix") {  // Botão 4

    OnClickFunctionSix();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionOne") {  // Botão 5
    OnClickFunctionOne();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionTwo") {  // Botão 6
    OnClickFunctionTwo();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionSeven") {  // Botão 7

    isAutomaticProtect ? isAutomaticProtect = false : isAutomaticProtect = true;
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionEight") {  // Botão lote

    LoteChanger();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionNine") {  // Botão Add

    AddKey();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionTen") {  // Botão Addc

    AddcKey();
    }

    else if(id==CHARTEVENT_OBJECT_CLICK && sparam =="bFunctionEleven") {  // Botão Barxbar

    BarStop();
    }
  //--- pressionamento de tecla   
  if(id==CHARTEVENT_KEYDOWN && ChaveGeralKey == true)
      {
        short sym= TranslateKey((int)lparam);
         //--- if the entered character is successfully converted to Unicode
        const string key = ShortToString(sym);  
         //Print("Pressionou a tecla - ", key);
        
        if(key == _Buy){
            OnClickFunctionThree();
        }else if(key == _Sell){
            OnClickFunctionFour();
        }else if(key == _CloseAllSell){
            Close_All_Sell();
        }else if(key == _CloseAllSellPositive){
            Close_All_Sell_Positive();
        }else if(key == _CloseAllBuy){
            Close_All_Buy();
        }else if(key == _CloseAllBuyPositive){
            Close_All_Buy_Positive();
        }else if(key == _CloseAll){
            Close_All();
        }else if(key == _CloseAllPositive){
            Close_All_Positive();
        }else if(key == _MoveBuyStopsBreakEven){
            BuyMoveAllStops(getAveragePrice_Buy());
        }else if(key == _MoveSellStopsBreakEven){
            SellMoveAllStops(getAveragePrice_Sell());
        }else if(key == _IsTrailingStopAutomatic){
            OnClickFunctionOne();
        }else if(key == _BuyPositionsAtLastLow){
            TrailingStop_Buy();
        }else if(key == _SellPositionsAtLastHigh){
            TrailingStop_Sell();
            Tp3x1();
        }else if(key == _CloseGreaterProfitBuy){
            CloseGreaterProfit_Buy();
        }else if(key == _CloseGreaterProfitSell){
            CloseGreaterProfit_Sell();
        }else if(key == _CoverVolume){
            coverVolume();
        }else if(key == _KeyAutomaticProtect){
            isAutomaticProtect ? isAutomaticProtect = false : isAutomaticProtect = true;
        }else if(key == _ChangeHands){
            ChangeHands();
        }else if(key == _Panic){
            OnClickFunctionTwo();
        }else if(key == _LoteChanger){
            LoteChanger();
        }else if(key == _Add){
            AddKey();
        }else if(key == _Even){
            OnClickFunctionSeven();
        }else if(key == _Grid){
            GridKey();
        }else if(key == _Bxb){
            BarStop();
        }else if(key == _Addc){
            AddcKey();
        }   
        
      }
  } 

//-------------------CHAVE GERAL------------------------------------------------ 
 
 // Funções ao pressionar os botões

 void OnClickBotomButton() // Função do botão liga e desliga
 {
 if(ChaveGeralKey == false){
 ChaveGeral = "ON";
 ChaveGeralKey = true;
 Print("Operational: "+ChaveGeral);
 }
  else if(ChaveGeralKey == true){
 ChaveGeral = "OFF";
 ChaveGeralKey = false;
 Close_All(); 
 Print("Operational: "+ChaveGeral);
 }
 }

//-----------------------Trailing Stop Avg on/off ------------------------------ 

 void OnClickFunctionOne()
{
      if(_PanelTrailingAvg == true){
        _PanelTrailingAvg = false;
        Print("Trailing Avg: Off.");
      }
      else if(_PanelTrailingAvg == false){
        _PanelTrailingAvg = true;
        Print("Trailing Avg: On.");
      }
}

//-----------------------Break Even Avg on/off ------------------------------ 

void OnClickFunctionSeven()
{
  if(_PanelBreakEvenAvg == true){
    _PanelBreakEvenAvg = false;
    Print("BreakEven Avg: Off.");
    }
  else if(_PanelBreakEvenAvg == false){
    _PanelBreakEvenAvg = true;
    Print("BreakEven Avg: On.");
  }
}

//--------------------------RESGATE--------------------------------------------- 

 void OnClickFunctionTwo() 
{
  if(ButtonTwoKey == false && Posicionado() == true && getFloatingProfit_value() < 0) {
    ButtonTwoKey = true;
    Print("Break Even output method triggered.");
  }
}
//-------------------COMPRA À MERCADO------------------------------------------- 

 void OnClickFunctionThree()
 { if(ChaveGeralKey == true && ask >= valor_media_low[0] ){
  int total = Bars(_Symbol,PERIOD_CURRENT);
  // Copia os preços de Mínima do Fractal Menor
  ArraySetAsSeries(LowMicro,true);   
  if(CopyLow(_Symbol,TimeFrameMediaLow,0,total,LowMicro)<=0)
  {
    Print("CopyOpen Micro failed, error ",GetLastError());
  }
  // Calcula o preço para a ordem pendente de compra
  double Preco_compra = ask;
  // Calcula o preço para o takeprofit
  double Alvo_compra = NormalizeDouble(Preco_compra + _take_Inicial * _Point, _Digits);
  double Alvo_compra2 = NormalizeDouble(Preco_compra + _take_Inicial2 * _Point, _Digits);
  // Calcula o preço para o stoploss
  double StopLossCompra = NormalizeDouble(Preco_compra - _StopInicial * _Point, _Digits);
  // Calcula o preço para o stoploss na mínima do candle anterior.
  //double StopLossCompra = NormalizeDouble(LowMicro[1] - _FolgaStop * _Point, _Digits);
  // Calcula o preço para o takeprofit
  //double DistanciaTake = (ask - StopLossCompra) * _RiscoRetorno ;
  //double Alvo_compra = ask + DistanciaTake;

m_trade.Buy(_Lote,_Symbol,Preco_compra,StopLossCompra,Alvo_compra,"Market Buy 1 Magic: "+(string)Magic_Number); // Entrada de compra 1
if(_AllowMarketBuy2) m_trade.Buy(_Lote,_Symbol,Preco_compra,StopLossCompra,Alvo_compra2,"Market Buy 2 Magic: "+(string)Magic_Number); // Entrada de compra 2
Print("Panel Market Buy");
 }
 }

//-------------------------VENDA À MERCADO-------------------------------------- 

 void OnClickFunctionFour()
 { if(ChaveGeralKey == true && ask <= valor_media_high[0]){
  int total = Bars(_Symbol,PERIOD_CURRENT);
  // Copia os preços de Mínima do Fractal Menor
  ArraySetAsSeries(HighMicro,true);   
  if(CopyHigh(_Symbol,TimeFrameMediaLow,0,total,HighMicro)<=0)
  {
    Print("CopyOpen Micro failed, error ",GetLastError());
    }
    // Calcula o preço para a ordem pendente de venda
    double Preco_venda = bid;
    // Calcula o preço para o takeprofit
    double Alvo_venda = NormalizeDouble(Preco_venda - _take_Inicial * _Point, _Digits);
    double Alvo_venda2 = NormalizeDouble(Preco_venda - _take_Inicial2 * _Point, _Digits);
    // Calcula o preço para o stoploss
    double StopLossVenda = NormalizeDouble(Preco_venda + _StopInicial * _Point, _Digits);
    // Calcula o preço para o stoploss na máxima do candle anterior.
    //double StopLossVenda = NormalizeDouble(HighMicro[1] + _FolgaStop * _Point, _Digits);
    // Calcula o preço para o takeprofit
    //double DistanciaTake = (StopLossVenda - bid) * _RiscoRetorno ;
    //double Alvo_venda = bid - DistanciaTake;

   m_trade.Sell(_Lote,_Symbol,Preco_venda,StopLossVenda,Alvo_venda,"Market Buy; Painel; Magic: "+(string)Magic_Number); // Entrada de venda 1
   if(_AllowMarketSell2) m_trade.Sell(_Lote,_Symbol,Preco_venda,StopLossVenda,Alvo_venda2,"Market Buy; Painel; Magic: "+(string)Magic_Number); // Entrada de venda 2
    Print("Panel Market Sell");
 }
 }

//-----------------------BUY STOP---------------------------------------------- 

 void OnClickFunctionFive()
 { if(ChaveGeralKey == true){
 /* int total = Bars(_Symbol,PERIOD_CURRENT);
  // Copia os preços de Mínima do Fractal Menor
  ArraySetAsSeries(LowMicro,true);   
  if(CopyLow(_Symbol,TimeFrameMediaLow,0,total,LowMicro)<=0)
  {
    Print("CopyOpen Micro failed, error ",GetLastError());
  }*/
  // Calcula o preço para a ordem pendente de compra
  double Preco_compra = NormalizeDouble(ask - _EntradaInicial * _Point, _Digits);
  // Calcula o preço para o takeprofit
  double Alvo_compra = NormalizeDouble(Preco_compra + _take_Inicial * _Point, _Digits);
  // Calcula o preço para o stoploss
  double StopLossCompra = NormalizeDouble(Preco_compra - _StopInicial * _Point, _Digits);

m_trade.BuyLimit(_Lote, Preco_compra, _Symbol, StopLossCompra, Alvo_compra, ORDER_TIME_DAY , 0, "Order sent by the panel"); // Entrada de compra 
Print("↑↑↑ Buy Positioned ↑↑↑");
 }
 }

//-----------------------SELL STOP--------------------------------------------- 

 void OnClickFunctionSix()
 { if(ChaveGeralKey == true){
  /*int total = Bars(_Symbol,PERIOD_CURRENT);
  // Copia os preços de Mínima do Fractal Menor
  ArraySetAsSeries(HighMicro,true);   
  if(CopyHigh(_Symbol,TimeFrameMediaLow,0,total,HighMicro)<=0)
  {
    Print("CopyOpen Micro failed, error ",GetLastError());
    }*/
    // Calcula o preço para a ordem pendente de venda
    double Preco_venda = NormalizeDouble(bid + _EntradaInicial * _Point, _Digits);
    // Calcula o preço para o takeprofit
    double Alvo_venda = NormalizeDouble(Preco_venda - _take_Inicial * _Point, _Digits);
    // Calcula o preço para o stoploss
    double StopLossVenda = NormalizeDouble(Preco_venda + _StopInicial * _Point, _Digits);

   m_trade.SellLimit(_Lote, Preco_venda, _Symbol, StopLossVenda, Alvo_venda, ORDER_TIME_DAY, 0,  "Order sent by the panel"); // Entrada de venda
    Print("↓↓↓ Sell Positioned ↓↓↓");
 }
 }

//-----------------------Lote Changer---------------------------------------------

void LoteChanger()
{
  if(_Lote == _LoteInicial){
      _Lote = _LoteTwo;
      Print("Lot defined for "+(string)_Lote);
  }

  else if(_Lote == _LoteTwo){ 
      _Lote = _LoteThree;
      Print("Lot defined for "+(string)_Lote);
  }

  else if(_Lote == _LoteThree){
      _Lote = _LoteInicial;
      Print("Lot defined for "+(string)_Lote);
  }

}

//-----------------------Add Key ---------------------------------------------

void AddKey()
{
  if(_AddKey == true){
  _AddKey = false;
  Print("Add Automático: Off.");
  }
  else if(_AddKey == false){
  _AddKey = true;
  Print("Add Automático: On.");
  }
}

//----------------------- BarStop Key ---------------------------------------------

void BarStop()
{
  if(_BarStop == true){
  _BarStop = false;
  Print("Bar Trailing: Off.");
  }
  else if(_BarStop == false){
  _BarStop = true;
  Print("Bar Trailing: On.");
  }
}

//-----------------------Grid Key ---------------------------------------------

void GridKey()
{
  if(_leverage == true){
  _leverage = false;
  Print("Grid: Off.");
  }
  else if(_leverage == false){
  _leverage = true;
  Print("Grid: On.");
  }
}

//-----------------------Addc Key ---------------------------------------------

void AddcKey()
{
  if(_Addckey == true){
  _Addckey = false;
  Print("Add Candle: Off.");
  }
  else if(_Addckey == false){
  _Addckey = true;
  Print("Add Candle: On.");
  }

}

//+------------------------------------------------------------------+
//|  Timer                                                           |
//+------------------------------------------------------------------+


void OnTimer()
  {
    pause=!pause;

    // Verifica needs_sync via PostgREST a cada SyncIntervalSec (o timer dispara a cada 3s)
    // PostgREST não conta como edge function invocation — só chama a edge function se sync pendente
    _SyncTickCounter++;
    int ticksNeeded = (SyncIntervalSec > 0) ? (SyncIntervalSec / 3) : 10;
    if(_SyncTickCounter >= ticksNeeded)
    {
      _SyncTickCounter = 0;
      if(CheckNeedsSync())
        FetchHandbotParams();
    }
  }
//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+


void OnTick()
  {
    CopyRates(Symbol(), Period(), 0, 5, rates);                   // 
    ArraySetAsSeries(rates,true);                                 // Organizar a ordem dos candles.

    //--- set ASK and BID
    ask = NormalizeDouble(SymbolInfoDouble(_Symbol, SYMBOL_ASK), _Digits);
    bid = NormalizeDouble(SymbolInfoDouble(_Symbol, SYMBOL_BID), _Digits);

    //--- Format dateTime
    TimeToStruct(TimeLocal(), timeNow);
    //Refresh candle timer
    refreshClock();


        //--- Negociation
        if(IsNegociationTime() == true && ChaveGeralKey == true )
          {  
            //atualiza as linhas de preço medio
            refresh_average_line_buy(ChartID());
            refresh_average_line_sell(ChartID());
            //verifica proteção de exposição
            if(isAutomaticProtect == true)
              {
              automaticProtect();
              }
            //Verificações. 
            getFloatingProfit(); // Atualiza o flutuante.
            DailyGainChecker(); // Checka se bateu a meta do dia.
            Lucrododia();       // Atualiza o Lucro do dia.
            //Sinais
            SinalDeCompra(); // procura sinal de compra
            SinalDeVenda();  // procura sinal de venda
            SinalH4();       // Filtro escopo macro
            //saidas
            SaidaVenda();
            Saidacompra();
              if(Comprado() == false && _RemoteAllowBuy) // Verifica se existe alguma ordem, se tem sinal de compra e se a meta ja foi batida
              { 
                double Preco_compra = ask;
                // Calcula o preço para o takeprofit
                double Alvo_compra = NormalizeDouble(Preco_compra + _take_Inicial * _Point, _Digits);
                // Calcula o preço para o stoploss
                double StopLossCompra = NormalizeDouble(Preco_compra - _StopInicial * _Point, _Digits);

                m_trade.Buy(_Lote,_Symbol,Preco_compra,StopLossCompra,Alvo_compra,"First Buy; Magic: "+(string)Magic_Number); // Entrada de compra
              }
              if(Comprado() == true && MetaProva == false && _RemoteGridAheadEnabled) // Grid a Favor (Buy)
              {
                GridFunction_Buy_ahead();
              }
              if(Comprado() == true && MetaProva == false && _RemoteGridContraEnabled) // Grid Contra (Buy)
              {
                GridFunction_Buy();
              }
              if(Comprado() == true && MetaProva == false && _AddKey == true ) // add function calling
              {
                AddFunction();
              }
              if(Comprado() == true && MetaProva == false && _Addckey == true ) // addc function calling
              {
                AddcFunction();
              }

              if(Vendido() == false && _RemoteAllowSell) // Verifica se existe alguma ordem, se tem sinal de venda e se a meta ja foi batida
                {
                  double Preco_venda = bid;
                  // Calcula o preço para o takeprofit
                  double Alvo_venda = NormalizeDouble(Preco_venda - _take_Inicial * _Point, _Digits);
                  // Calcula o preço para o stoploss
                  double StopLossVenda = NormalizeDouble(Preco_venda + _StopInicial * _Point, _Digits);

                  m_trade.Sell(_Lote,_Symbol,Preco_venda,StopLossVenda,Alvo_venda,"First Sell; Magic: "+(string)Magic_Number); // Entrada de venda
                }
                if(Vendido() == true && MetaProva == false && _RemoteGridAheadEnabled) // Grid a Favor (Sell)
                {
                GridFunction_Sell_ahead();
                }
                if(Vendido() == true && MetaProva == false && _RemoteGridContraEnabled) // Grid Contra (Sell)
                {
                GridFunction_Sell();
                }
                if(Vendido() == true && MetaProva == false && _AddKey == true ) // addc function calling
                { 
                AddFunction();                 
                }
                if(Vendido() == true && MetaProva == false && _Addckey == true ) // addc function calling
                { 
                AddcFunction();                 
                }
                

              if(Posicionado()){
                  if(isNewCandleBar() && _BarStop == true){
                  TrailingStop_Buy();
                  TrailingStop_Sell();
                  }
                  StopMode();
                  TraillingStop();
                  TraillingStopAvg();
                  BreakEvenAvg();
                  BreakEven();
                  }
              if (Pendurado()){
                if(isNewCandleBar() && (_RemoteParamsLoaded ? _RemoteBarRefreshEntry : _RefreshEntry)){
                Refresh_Buy();
                Refresh_Sell();
              } }


          }

      if(!NovoCandle(rates[0].time))
      return;
  }

//+----------------------------------------------------------------------------+
//| Trading Functions                                                          |
//+----------------------------------------------------------------------------+


bool IsNegociationTime()
{ 

  // Check input values
  if(_hourStart < 0 || _hourStart > 24 || _hourEnd < 0 || _hourEnd > 24 ||
    _minuteStart < 0 || _minuteStart > 59 || _minuteEnd < 0 || _minuteEnd > 59)
    { 
      // Invalid values
      Print("Invalid input time values!");
      return false;
    }

  // If the range crosses midnight
  if(_hourStart > _hourEnd || (_hourStart == _hourEnd && _minuteStart > _minuteEnd))
    {
      if((timeNow.hour > _hourStart || (timeNow.hour == _hourStart && timeNow.min >= _minuteStart)) ||
          (timeNow.hour < _hourEnd || (timeNow.hour == _hourEnd && timeNow.min <= _minuteEnd)))
        { Comment("Time Now: ", timeNow.hour, ":", timeNow.min, ":", "\nOpen: ", OpenMicro[0],"\nAccount Balance1: ");
          return true;
        }
    }
  else if((timeNow.hour > _hourStart || (timeNow.hour == _hourStart && timeNow.min >= _minuteStart)) &&
        (timeNow.hour < _hourEnd || (timeNow.hour == _hourEnd && timeNow.min <= _minuteEnd)))
        { 
          IndicatorsRefresh();
          HorarioTrade = "Waiting for entry";
          ExtDialog.UpdatePanel(); // update Panel  
          return true;
        }
  else if((timeNow.hour > _HourCheck || (timeNow.hour == _HourCheck && timeNow.min >= _MinCheckStart)) &&
        (timeNow.hour < _HourCheck || (timeNow.hour == _HourCheck && timeNow.min <= _MinCheckEnd)))
        {
          ValidateLicense(false);
        }
  
  else 
    {
        if ((timeNow.hour >= _hourEnd && timeNow.min > _minuteEnd) || (timeNow.hour <= _hourStart && timeNow.min < _minuteStart)){
          ResetDailyGain();
          }
        HorarioTrade = "Outside Trading Hours.";
        ExtDialog.UpdatePanel(); // update Panel 
        if (Posicionado() && timeNow.hour == _hourEnd && timeNow.min > _minuteEnd){
          Close_All();
          Print("Orders Closed by session end.");
        }

    }
  return false;
  
  
}


  
//+------------------------------------------------------------------+
//|Account Checker                                                   |
//+------------------------------------------------------------------+

// OnInit
bool ValidateLicense(bool isInit)
{
struct stLocalLicense {
        long account;
        datetime expiration;
    };

    // --- LISTA BRANCA LOCAL (Com data de expiração) ---
    stLocalLicense lic[] = {
        { 123456, D'2026.12.31 23:59' }, // Exemplo: Conta 123456 válida até o fim de 2026
        { 789012, D'2026.06.30 00:00' }  // Outro exemplo
    };
    
    long contaAtual = AccountInfoInteger(ACCOUNT_LOGIN);
    datetime hoje = TimeCurrent();
    
    for(int i=0; i<ArraySize(lic); i++) {
        if(contaAtual == lic[i].account) {
            if(hoje < lic[i].expiration) {
                Print("Conta autorizada via lista branca local. Validade: ", TimeToString(lic[i].expiration));
                return true;
            } else {
                Print("Licença local encontrada para a conta ", contaAtual, " porém está EXPIRADA (Venceu em: ", TimeToString(lic[i].expiration), "). Prosseguindo para verificação online...");
                break; // Sai do loop para tentar a verificação online, ou poderia retornar false se quisesse bloquear total
            }
        }
    }
    // --------------------------------------------------

    if(MQLInfoInteger(MQL_TESTER))
        return true;

    // Runtime Throttling: Check only once every hour (or period larger than the check window)
    // The check window is only 3 minutes (02:15-02:18).
    
    if(!isInit) {
        static ulong lastCheckTime = 0;
        if(GetTickCount() - lastCheckTime < 300000) return true; // 5 minutes cache
        lastCheckTime = GetTickCount();
    }

// --- CÓDIGO CORRIGIDO PARA O EXPERT ---
string url = "https://tradexperience.com.br/validate_boleta.php";
string headers = "Content-Type: application/x-www-form-urlencoded\r\n"; // ADICIONE ESTA LINHA
char post[], result[];
string resultHeaders;
int accountNumber = (int)AccountInfoInteger(ACCOUNT_LOGIN);
string postText = "account_no="+IntegerToString(accountNumber);
    
    // Attempt logic
    int maxAttempts = 3;
    
    for(int attempt=0; attempt < maxAttempts; attempt++) {
         if(attempt > 0) {
             Print("Tentativa de login: ", attempt + 1);
             Sleep(isInit ? 1000 : 30000); // 30s sleep in runtime (legacy behavior), 1s in init
         } else {
             Print(isInit ? "Primeira tentativa de login." : "Verificando licença. Primeira tentativa de login.");
         }
         
         StringToCharArray(postText,post,0,WHOLE_ARRAY,CP_UTF8);
         int response = WebRequest("POST",url,headers,5000,post,result,resultHeaders);
         Print("Resposta do servidor: ", response, " ms", " e o ultimo erro é: ", GetLastError());
         
         string resultText = CharArrayToString(result);
         Print(resultText);
         
         if(resultText == "success") return true;
    }
    
    MessageBox("Licença inválida ou expirada. O robô será removido por segurança. Adquira sua licença em www.tradexperience.com.br", "Fate Changer - Licença");
    
    if(isInit) {
        return false;
    } else {
        ExpertRemove();
        return false;
    }
}

//+------------------------------------------------------------------+
//|Carregar Médias                                                   |
//+------------------------------------------------------------------+


bool CarregarMedias() {
        // Fractal Micro
        if(handle_media_low == INVALID_HANDLE) {
          // Calcula a média móvel Curta de acordo com os Presets
          handle_media_low = iMA(_Symbol,TimeFrameMediaLow,periodo_media_low,0,TipoMediaLow,PRICE_LOW);    
            if(handle_media_low == INVALID_HANDLE) {
              Print ("Error loading low average handler");
              return false;       
          }
      }
      
        if(handle_media_high == INVALID_HANDLE) {
            // Calcula a média móvel Curta de acordo com os Presets
            handle_media_high = iMA(_Symbol,TimeFrameMediaHigh,periodo_media_high,0,TipoMediaHigh,PRICE_HIGH);    
            if(handle_media_low == INVALID_HANDLE) {
            Print ("Error loading high average handler");
            return false;       
          }
      }
      
      if(handle_media_lenta == INVALID_HANDLE) {
            // Calcula a média móvel Curta de acordo com os Presets
            handle_media_lenta = iMA(_Symbol,TimeFrameMediaLenta,periodo_media_lenta,0,TipoMediaLenta,PRICE_CLOSE);    
            if(handle_media_lenta == INVALID_HANDLE) {
            Print ("Error loading slow average handler");
            return false;       
          }
      }
       // Fractal Macro
        if(handle_media_low_macro == INVALID_HANDLE) {
          // Calcula a média móvel Curta de acordo com os Presets
          handle_media_low_macro = iMA(_Symbol,TimeFrameMediaLow_macro,periodo_media_low_macro,0,TipoMediaLow_macro,PRICE_LOW);    
            if(handle_media_low_macro == INVALID_HANDLE) {
              Print ("Error loading low macro average handler");
              return false;       
          }
      }
      
        if(handle_media_high_macro == INVALID_HANDLE) {
            // Calcula a média móvel Curta de acordo com os Presets
            handle_media_high_macro = iMA(_Symbol,TimeFrameMediaHigh_macro,periodo_media_high_macro,0,TipoMediaHigh_macro,PRICE_HIGH);    
            if(handle_media_low_macro == INVALID_HANDLE) {
            Print ("Error loading high macro average handler");
            return false;       
          }
      }
      
      if(handle_media_lenta_macro == INVALID_HANDLE) {
            // Calcula a média móvel Curta de acordo com os Presets
            handle_media_lenta_macro = iMA(_Symbol,TimeFrameMediaLenta_macro,periodo_media_lenta_macro,0,TipoMediaLenta_macro,PRICE_CLOSE);    
            if(handle_media_lenta_macro == INVALID_HANDLE) {
            Print ("Error loading handler for slow average macro");
            return false;       
          }
      }
          if(handle_adx == INVALID_HANDLE) {
            // Calcula a média móvel Curta de acordo com os Presets
            handle_adx = iADX(_Symbol,TimeFrameAdx,InpAdxPeriod);    
            if(handle_adx == INVALID_HANDLE) {
            Print ("Error loading ADX handler");
            return false;       
          }
      }
          if(handle_adx_Macro == INVALID_HANDLE) {
            // Calcula a média móvel Curta de acordo com os Presets
            handle_adx_Macro = iADX(_Symbol,TimeFrameAdxMacro,InpAdxPeriodMacro);    
            if(handle_adx_Macro == INVALID_HANDLE) {
            Print ("Error loading ADX Macro handler");
            return false;       
          }
      }
    return true;    
}



//+-----------------------------------------------------------------------------------------------------------------------------+
//|                                              ~~~~~~~~~~~~~ ↓ SINAIS ↑  ~~~~~~~~~~~~~~                                       |
//+-----------------------------------------------------------------------------------------------------------------------------+



// +------------------------------------------------------------------+
// |  Sinal Compra - Entrada                                          |
// +------------------------------------------------------------------+



bool SinalDeCompra(){
  if (OpenMicro[1] < valor_media_high[1] && CloseMicro[1] > valor_media_high[1] && DiMais[1] > DiMenos[1] && AdxMain[0] > AdxMain[1] && AdxMain[1] > AdxMain[2] && DiMais_Macro[1] > DiMenos_Macro[1] && Posicionado()== false && Pendurado() == false) {

    habilitarvenda = 1;
    entradadecompra = 1;  
    if(ObjectCreate(ChartID(), "Buy Signal"+_Symbol,OBJ_ARROW, 0, rates[0].time, rates[0].open)){
      
      ObjectSetInteger(ChartID(), "Buy Signal"+_Symbol, OBJPROP_ARROWCODE, 233);
      ObjectSetInteger(ChartID(), "Buy Signal"+_Symbol, OBJPROP_COLOR, clrDodgerBlue);
      ObjectSetInteger(ChartID(), "Buy Signal"+_Symbol, OBJPROP_ANCHOR, ANCHOR_TOP);
      
  
      }
      return true;
  }
return false;

}
// +----------------------------------------------------------------+
// |  Sinal Venda - Entrada                                         |
// +----------------------------------------------------------------+


bool SinalDeVenda(){

    if ( OpenMicro[1] > valor_media_low[1] && CloseMicro[1] < valor_media_low[1] && DiMais[1] < DiMenos[1] && AdxMain[0] > AdxMain[1] && AdxMain[1] > AdxMain[2] && DiMais_Macro[1] < DiMenos_Macro[1] && Posicionado()== false && Pendurado() == false) {   
    
    habilitarcompra = 1;
    entradadevenda = 1;
    if(ObjectCreate(ChartID(), "Sell ​​Signal"+_Symbol,OBJ_ARROW, 0, rates[1].time, rates[0].open)){
      
      ObjectSetInteger(ChartID(), "Sell ​​Signal"+_Symbol, OBJPROP_ARROWCODE, 234);
      ObjectSetInteger(ChartID(), "Sell ​​Signal"+_Symbol, OBJPROP_COLOR, clrRed);
      ObjectSetInteger(ChartID(), "Sell ​​Signal"+_Symbol, OBJPROP_ANCHOR, ANCHOR_BOTTOM);
      }
      return true;
    }
return false;
}


// +----------------------------------------------------------------+
// |  Sinal da segunda entrada    - Defesa Compra                   |
// +----------------------------------------------------------------+


bool HaltCompraLow()
{
  if (Posicionado() == false && OpenMicro[1] > valor_media_low[1] && LowMicro[1] < valor_media_low [1] && CloseMicro[1] > valor_media_low[1] && OpenMicro[0] > valor_media_low [0] && habilitarvenda == 1) 
  {   entradadecompra = 1;
      habilitarvenda = 2;
      
      if(ObjectCreate(ChartID(), "Buy Signal - Halt", OBJ_ARROW, 0, rates[0].time, rates[0].open))
      {
        ObjectSetInteger(ChartID(), "Buy Signal - Halt", OBJPROP_ARROWCODE, 233);
        ObjectSetInteger(ChartID(), "Buy Signal - Halt", OBJPROP_COLOR, clrGold);
        ObjectSetInteger(ChartID(), "Buy Signal - Halt", OBJPROP_ANCHOR, ANCHOR_TOP);
      }
    return true;
    }
  return false;
}


// +----------------------------------------------------------------+
// |  Sinal da segunda entrada    - Defesa Venda                    |
// +----------------------------------------------------------------+


bool HaltVendaHigh()
{
  if (Posicionado() == false && OpenMicro[1] < valor_media_high[1] && HighMicro[1] > valor_media_high [1] && CloseMicro[1] < valor_media_high[1] && OpenMicro[0] < valor_media_high[0] && habilitarcompra == 1) 
  {   entradadevenda = 1;
      habilitarcompra = 2;
      
      if(ObjectCreate(ChartID(), "Sell ​​Signal - Halt", OBJ_ARROW, 0, rates[0].time, rates[0].open))
      {
        ObjectSetInteger(ChartID(), "Sell ​​Signal - Halt", OBJPROP_ARROWCODE, 234);
        ObjectSetInteger(ChartID(), "Sell ​​Signal - Halt", OBJPROP_COLOR, clrGold);
        ObjectSetInteger(ChartID(), "Sell ​​Signal - Halt", OBJPROP_ANCHOR, ANCHOR_BOTTOM);
      }
    return true;
    }
  return false;
}


//+----------------------------------------------------------------+
//|Sinal Saída da compra - Venda de realização/Saída               |
//+----------------------------------------------------------------+


bool Saidacompra(){

    if (OpenMicro[1] > valor_media_low[1] && OpenMicro[0] < valor_media_low [0] && habilitarvenda >= 1) {   
    habilitarvenda = 0;
        
    if(ObjectCreate(ChartID(), "Sell ​​Signal - Realization",OBJ_ARROW, 0, rates[0].time, rates[0].open)){
      
      ObjectSetInteger(ChartID(), "Sell ​Signal - Realization", OBJPROP_ARROWCODE, 234);
      ObjectSetInteger(ChartID(), "Sell ​​Signal - Realization", OBJPROP_COLOR, clrWhite);
      ObjectSetInteger(ChartID(), "Sell ​​Signal - Realization", OBJPROP_ANCHOR, ANCHOR_BOTTOM);
      }
    return true;
      }
return false;
}


//+----------------------------------------------------------------+
//|Sinal Saída da venda - Compra de realização/Saída               |
//+----------------------------------------------------------------+



bool SaidaVenda(){

    if (OpenMicro[1] < valor_media_high[1] && OpenMicro[0] > valor_media_high [0] && habilitarcompra >= 1) {   

    habilitarcompra = 0;  
    if(ObjectCreate(ChartID(), "Buy signal - realization",OBJ_ARROW, 0, rates[0].time, rates[0].open)){
      
      ObjectSetInteger(ChartID(), "Buy signal - realization", OBJPROP_ARROWCODE, 233);
      ObjectSetInteger(ChartID(), "Buy signal - realization", OBJPROP_COLOR, clrWhite);
      ObjectSetInteger(ChartID(), "Buy signal - realization", OBJPROP_ANCHOR, ANCHOR_TOP);
      }
      return true;
      }
return false;
}


//+------------------------------------------------------------------+
//|Sinal H4                                                          |
//+------------------------------------------------------------------+


void SinalH4(){

    if (OpenMacro[0] > valor_media_high_macro[0] && bid > valor_media_high_macro[0] && DiMais_Macro[1] > DiMenos_Macro[1]) {
      H4Signal = "Up";
      }
    else if (OpenMacro[0] > valor_media_high_macro[0] && ask < valor_media_high_macro[0] && DiMais_Macro[1] > DiMenos_Macro[1]) {
      H4Signal = "Pullback on uptrend";
      }    
    else if (OpenMacro[0] < valor_media_low_macro[0] && ask < valor_media_low_macro[0] && DiMais_Macro[1] < DiMenos_Macro[1]) {
      H4Signal = "Down";
      
      }
    else if (OpenMacro[0] < valor_media_low_macro[0] && bid > valor_media_high_macro[0] && DiMais_Macro[1] < DiMenos_Macro[1]) {
      H4Signal = "Pullback on Downtrend";
      
      }    
    else if (OpenMacro[0] < valor_media_high_macro[0] && bid > valor_media_high_macro[0]) {
      H4Signal = "Entering Uptrend";
      }           
    else if (OpenMacro[0] > valor_media_low_macro[0] && ask < valor_media_low_macro[0]) {
      H4Signal = "Entering Downtrend";
      
      }      
  else if (ask < valor_media_high_macro[0] && bid > valor_media_low_macro[0] )
    {
      H4Signal = "Range Zone";
      return;
    }
      }
      

//+-----------------------------------------------------------------------------------------------------------------------------+
//|                                              ~~~~~~~~~~~~~ FUNÇÕES ~~~~~~~~~~~~~~                                           |
//+-----------------------------------------------------------------------------------------------------------------------------+

//+-----------------------------------------------------------------+
//|       Meta para o dia - Gain e loss                             |
//+-----------------------------------------------------------------+

void IndicatorsRefresh()
{
           int total = Bars(_Symbol,PERIOD_CURRENT);

          // Copia os preços de abertura do Fractal Menor
          ArraySetAsSeries(OpenMicro,true);   

          if(CopyOpen(_Symbol,TimeFrameMediaLow,0,total,OpenMicro)<=0)
            {
              Print("CopyOpen Micro failed, error ",GetLastError());
            }

          // Copia os preços de Máxima do Fractal Menor
          ArraySetAsSeries(HighMicro,true);   

          if(CopyHigh(_Symbol,TimeFrameMediaLow,0,total,HighMicro)<=0)
            {
              Print("CopyOpen Micro failed, error ",GetLastError());
            }

           // Copia os preços de Mínima do Fractal Menor
            ArraySetAsSeries(LowMicro,true);   

            if(CopyLow(_Symbol,TimeFrameMediaLow,0,total,LowMicro)<=0)
            {
              Print("CopyOpen Micro failed, error ",GetLastError());
            }

            // Copia os preços de Fechamento do Fractal Menor
            ArraySetAsSeries(CloseMicro,true);   

            if(CopyClose(_Symbol,TimeFrameMediaLow,0,total,CloseMicro)<=0)
            {
              Print("CopyOpen Micro failed, error ",GetLastError());
            }

            // Copia os preços de abertura do Fractal Maior
            ArraySetAsSeries(OpenMacro,true);   
            if(CopyOpen(_Symbol,TimeFrameMediaLow_macro,0,total,OpenMacro)<=0)
            {
              Print("CopyOpen Macro failed, error ",GetLastError());
            }
            // Micro

              CopyBuffer(handle_media_low, 0, 0, 5, valor_media_low);       //Buffer da Média Móvel - pra carregar os valores corretos de cada média.
              ArraySetAsSeries(valor_media_low,true);                       //Organizar a ordem dos candles.
              CopyBuffer(handle_media_high, 0, 0, 5, valor_media_high);     //Buffer da Média Móvel - pra carregar os valores corretos de cada média.
              ArraySetAsSeries(valor_media_high,true);                      //  Organizar a ordem dos candles.
              CopyBuffer(handle_media_lenta, 0, 0, 5, valor_media_lenta);   //Buffer da Média Móvel - pra carregar os valores corretos de cada média.
              ArraySetAsSeries(valor_media_lenta,true);                     //Organizar a ordem dos candles.
              CopyBuffer(handle_adx,0,0,3,AdxMain);                         // Buffer do ADX
              ArraySetAsSeries(AdxMain, true);                              // Organizar ADX
              CopyBuffer(handle_adx,1,0,3,DiMais);                          // Buffer do ADX
              ArraySetAsSeries(DiMais, true);                               // Organizar ADX
              CopyBuffer(handle_adx,2,0,3,DiMenos);                         // Buffer do ADX
              ArraySetAsSeries(DiMenos, true);                              // Organizar ADX


              // Macro

              CopyBuffer(handle_media_low_macro, 0, 0, 5, valor_media_low_macro);        //Buffer da Média Móvel - pra carregar os valores corretos de cada média.
              ArraySetAsSeries(valor_media_low_macro,true);                              //Organizar a ordem dos candles.
              CopyBuffer(handle_media_high_macro, 0, 0, 5, valor_media_high_macro);      //Buffer da Média Móvel - pra carregar os valores corretos de cada média.
              ArraySetAsSeries(valor_media_high_macro,true);                             //Organizar a ordem dos candles.
              CopyBuffer(handle_media_lenta_macro, 0, 0, 5, valor_media_lenta_macro);    //Buffer da Média Móvel - pra carregar os valores corretos de cada média.
              ArraySetAsSeries(valor_media_lenta_macro,true);                            //Organizar a ordem dos candles.
              CopyBuffer(handle_adx_Macro,0,0,3,AdxMain_Macro);                          // Buffer do ADX
              ArraySetAsSeries(AdxMain, true);                                           // Organizar ADX
              CopyBuffer(handle_adx_Macro,1,0,3,DiMais_Macro);                           // Buffer do ADX
              ArraySetAsSeries(DiMais_Macro, true);                                      // Organizar ADX
              CopyBuffer(handle_adx_Macro,2,0,3,DiMenos_Macro);                          // Buffer do ADX
              ArraySetAsSeries(DiMenos_Macro, true);                                     // Organizar ADX
}



//+-----------------------------------------------------------------+
//|       Meta para o dia - Gain e loss                             |
//+-----------------------------------------------------------------+


void  DailyGainChecker()
{ 
  if ( AccountEquity >= Meta_Global )
  {  Close_All(); 
     MetaProva = true;
     ChaveGeralKey = true;
     MessageBox("Daily Target achieved! Time to report and rest your mind.");
    } 
    else if ( Lucrododia() <= Limite_Loss*- 1 && DailyLoss == false )
  { DailyGain = true;
    DailyLoss = true;
  Print("Daily Loss limit reached, let's take it easy to not to give it all back in one day.");
  Close_All(); 
  ChaveGeralKey = false;
    }   
  else 
    DailyGain = false;
}

//+-----------------------------------------------------------------+
//|      TP 3x1                                                     |
//+-----------------------------------------------------------------+

void Tp3x1()
{
// get the ask price
double Ask=NormalizeDouble (SymbolInfoDouble (_Symbol,SYMBOL_ASK),_Digits);
// if we have no position

// Call the trailing Stop Module
CheckBreakEvenStop(Ask);
}
void CheckBreakEvenStop(double Ask)
{
//Check all open positions for the current symbol
for(int i=PositionsTotal()-1; i>=0; i--) // count all currency pair positions
{

string symbol=PositionGetSymbol(i); // get position symbol

if (_Symbol==symbol) // if chart symbol equals position symbol
{
 // get the ticket number
 ulong PositionTicket=PositionGetInteger(POSITION_TICKET);
 // get the position entry price for placing stop
 
 double sl=PositionGetDouble(POSITION_SL);
 double tp=PositionGetDouble(POSITION_SL);
 double entry=PositionGetDouble(POSITION_PRICE_OPEN);
 double tp1=entry-(entry-sl)*-2.618; // calculate the 3x1 TP
 {
 // modify the stop loss
 Trade.PositionModify(PositionTicket,sl,tp1);
 }
 } // if loop closed
 } // end for loop

}

//+-----------------------------------------------------------------+
//|      Resetar Meta para o dia                                    |
//+-----------------------------------------------------------------+


void ResetDailyGain()
{
  if ( DailyGain == true )
  { DailyGain = false;
    DailyLoss = false; 
  Print("Daily Target Renewed, Let's go for another day Without greed.");
    }
  _Lote = _LoteInicial;
  saldo_inicial = saldo_inicial + Lucrododia();
  habilitarcompra = 0;
  habilitarvenda = 0;
}

//+------------------------------------------------------------------+
//|        Relógio                                                   |
//+------------------------------------------------------------------+
void refreshClock() {
  static bool inRefresh = false;
  if (inRefresh) return;
  inRefresh = true;
  ShowClock();
  ChartRedraw();
  inRefresh = false;
}

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
void ShowClock() {
  int periodMinutes = periodToMinutes(Period());
  int shift = periodMinutes*TimerShift*60;
  int currentTime = (int)TimeCurrent();
  int localTime = (int)TimeLocal();
  int barTime = (int)iTime();
  int diff = (int)MathMax(round((currentTime-localTime)/3600.0)*3600,-24*3600);

  color theColor;
  string time = getTime(barTime+periodMinutes*60-localTime-diff, theColor);
  time = (TerminalInfoInteger(TERMINAL_CONNECTED)) ? time : time + " x";

  if(ObjectFind(0,clockName) < 0)
    ObjectCreate(0,clockName,OBJ_TEXT,0,barTime+shift,0);
  
  ObjectSetString(0,clockName,OBJPROP_TEXT,time);
  ObjectSetString(0,clockName,OBJPROP_FONT,"Arial");
  ObjectSetInteger(0,clockName,OBJPROP_FONTSIZE,TimeFontSize);
  ObjectSetInteger(0,clockName,OBJPROP_COLOR,theColor);
  
  if (ChartGetInteger(0,CHART_SHIFT,0)==0 && (shift >=0))
    ObjectSetInteger(0,clockName,OBJPROP_TIME,barTime-shift*3);
  else  ObjectSetInteger(0,clockName,OBJPROP_TIME,barTime+shift);

  double price[];
  if (CopyClose(Symbol(),0,0,1,price)<=0) return;
  double atr[];
  if (CopyBuffer(atrHandle,0,0,1,atr)<=0) return;
  price[0] += 3.0*atr[0]/4.0;

  bool visible = ((ChartGetInteger(0,CHART_VISIBLE_BARS,0)-ChartGetInteger(0,CHART_FIRST_VISIBLE_BAR,0)) > 0);
  if (visible && price[0] >= ChartGetDouble(0,CHART_PRICE_MAX,0))
    ObjectSetDouble(0,clockName,OBJPROP_PRICE,price[0]-1.5*atr[0]);
  else  ObjectSetDouble(0,clockName,OBJPROP_PRICE,price[0]);
}

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
string getTime(int times, color& theColor) {
  string stime = "";
  int seconds;
  int minutes;
  int hours;

  if (times < 0) {
    theColor = ValuesNegativeColor;
    times = (int)fabs(times);
  } else {
    theColor = ValuesPositiveColor;
  }
  seconds = (times%60);
  hours = (times-times%3600)/3600;
  minutes = (times-seconds)/60-hours*60;

  if (hours > 0)
    if (minutes < 10)
      stime = stime + (string)hours + ":0";
    else
      stime = stime + (string)hours + ":";
  stime = stime + (string)minutes;
  if (seconds < 10)
    stime = stime + ":0" + (string)seconds;
  else
    stime = stime + ":" + (string)seconds;
  return(stime);
}

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
datetime iTime(ENUM_TIMEFRAMES forPeriod=PERIOD_CURRENT) {
  datetime times[];
  if (CopyTime(Symbol(),forPeriod,0,1,times)<=0) return(TimeLocal());
  return(times[0]);
}

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
int periodToMinutes(int period) {
  int i;
  static int _per[] = {1,2,3,4,5,6,10,12,15,20,30,0x4001,0x4002,0x4003,0x4004,0x4006,0x4008,0x400c,0x4018,0x8001,0xc001};
  static int _min[] = {1,2,3,4,5,6,10,12,15,20,30,60,120,180,240,360,480,720,1440,10080,43200};

  if (period == PERIOD_CURRENT)
    period = Period();
  for(i = 0; i < 20; i++)
    if(period == _per[i])
      break;
  return(_min[i]);
}



//+-----------------------------------------------------------------+
//|Lucro do Dia                                                     |
//+-----------------------------------------------------------------+


double Lucrododia()
  { AccountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
  AccountEquity = AccountInfoDouble(ACCOUNT_EQUITY);
    double Lucrando = AccountEquity - saldo_inicial;
    Lucrando = NormalizeDouble(Lucrando, 2);
    return Lucrando;
  }    


//+-----------------------------------------------------------------+
//|chamar Traling Stop                                              |
//+-----------------------------------------------------------------+



void CallHalt() 
{
  if ( habilitarcompra == 1 )
  {
    HaltVendaHigh();
  }
  if ( habilitarvenda == 1 )
  {
    HaltCompraLow();
  }
}

//+-----------------------------------------------------------------+
//|       Alternar entre Trailing avg, normal e evenavg             |
//+-----------------------------------------------------------------+

void StopMode()
{
   // Em hedge (comprado E vendido ao mesmo tempo), protege o lado que está perdendo:
   // só aplica trailing pts no lado que está ganhando.
   // Para posições simples (só BUY ou só SELL), os flags ficam sempre true —
   // o próprio TraillingStop() controla a ativação pelo gatilho de pontos.
   if (!Posicionado()) return;

   _PanelTrailingBuy  = true;
   _PanelTrailingSell = true;

   if (Comprado() && Vendido())
   {
      double buypriceOpen  = getAveragePrice_Buy();
      double sellpriceOpen = getAveragePrice_Sell();
      double GatilhoBuy    = NormalizeDouble((_RemoteParamsLoaded ? _RemoteTrailingPtsDistance : _TrailingTrigger) * _Point, _Digits);
      double GatilhoSell   = GatilhoBuy;

      bool buyInProfit  = (bid > buypriceOpen  + GatilhoBuy);
      bool sellInProfit = (ask < sellpriceOpen - GatilhoSell);

      if (buyInProfit && !sellInProfit)
      {
         _PanelTrailingBuy  = true;
         _PanelTrailingSell = false;
      }
      else if (!buyInProfit && sellInProfit)
      {
         _PanelTrailingBuy  = false;
         _PanelTrailingSell = true;
      }
   }
}

//+-----------------------------------------------------------------+
//|Trailing Stop pontos                                             |
//+-----------------------------------------------------------------+

void TraillingStop()
{
   if ((_RemoteParamsLoaded ? _RemoteTrailingPtsEnabled : _AllowTrailing) && Posicionado())
   {
      for (int i = 0; i < PositionsTotal(); i++)
      {
         ulong positionTicket = PositionGetTicket(i);
         if (!PositionSelectByTicket(positionTicket))
            continue;

         string positionSymbol = PositionGetString(POSITION_SYMBOL);
         if (positionSymbol != _Symbol)
            continue;

         ulong magic = PositionGetInteger(POSITION_MAGIC);
         if (magic != Magic_Number)
            continue;

         double priceOpen = PositionGetDouble(POSITION_PRICE_OPEN);

         if (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && _PanelTrailingBuy)
         {
            double Gatilho      = NormalizeDouble((_RemoteParamsLoaded ? _RemoteTrailingPtsDistance : _TrailingTrigger) * _Point, _Digits);
            double Folgadopreco = NormalizeDouble((_RemoteParamsLoaded ? _RemoteTrailingPtsStop     : _TrailingPoints)  * _Point, _Digits);

            if (bid > priceOpen + Gatilho)
            {
               double newSL     = NormalizeDouble(bid - Folgadopreco, _Digits);
               double currentSL = m_position.StopLoss();

               // Trava: nunca mover o SL para abaixo do preço de entrada.
               if ((currentSL == 0 || newSL > currentSL) && newSL >= priceOpen)
               {
                  Print("Trailing Stop Updated for BUY on ", _Symbol);
                  m_trade.SetAsyncMode(true);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }

         if (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && _PanelTrailingSell)
         {
            double Gatilho      = NormalizeDouble((_RemoteParamsLoaded ? _RemoteTrailingPtsDistance : _TrailingTrigger) * _Point, _Digits);
            double Folgadopreco = NormalizeDouble((_RemoteParamsLoaded ? _RemoteTrailingPtsStop     : _TrailingPoints)  * _Point, _Digits);

            if (ask < priceOpen - Gatilho)
            {
               double newSL     = NormalizeDouble(ask + Folgadopreco, _Digits);
               double currentSL = m_position.StopLoss();

               // Trava: nunca mover o SL para acima do preço de entrada.
               if ((currentSL == 0 || newSL < currentSL) && newSL <= priceOpen)
               {
                  Print("Trailing Stop Updated for SELL on ", _Symbol);
                  m_trade.SetAsyncMode(true);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }
      }
   }
   m_trade.SetAsyncMode(false);
}

//+-----------------------------------------------------------------+
//|Trailing Stop AVG Price                                          |
//+-----------------------------------------------------------------+

void TraillingStopAvg()
{
   if (_PanelTrailingAvg && Posicionado())
   {
      for (int i = 0; i < PositionsTotal(); i++)
      {
         ulong positionTicket = PositionGetTicket(i);
         if (!PositionSelectByTicket(positionTicket))
            continue;

         string positionSymbol = PositionGetString(POSITION_SYMBOL);
         if (positionSymbol != _Symbol)
            continue;

         ulong magic = PositionGetInteger(POSITION_MAGIC);
         if (magic != Magic_Number)
            continue;

         ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         double avgOpen      = (posType == POSITION_TYPE_BUY) ? getAveragePrice_Buy() : getAveragePrice_Sell();
         double posOpen      = PositionGetDouble(POSITION_PRICE_OPEN);
         double Gatilho      = NormalizeDouble((_RemoteParamsLoaded ? _RemoteTrailingAvgDistance : _TrailingTriggerAvg) * _Point, _Digits);
         double Folgadopreco = NormalizeDouble((_RemoteParamsLoaded ? _RemoteTrailingAvgStop     : _TrailingPointsAvg)  * _Point, _Digits);
         double SL           = m_position.StopLoss();

         if (posType == POSITION_TYPE_BUY)
         {
            if (bid > avgOpen + Gatilho)
            {
               double newSL  = NormalizeDouble(bid - Folgadopreco, _Digits);
               // Trava dupla: SL nunca abaixo do médio NEM do open da posição individual.
               double floor_ = MathMax(avgOpen, posOpen);
               if ((SL == 0 || newSL > SL) && newSL >= floor_)
               {
                  Print("AVG: Stop BUY Updated on ", _Symbol);
                  m_trade.SetAsyncMode(true);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }
         else if (posType == POSITION_TYPE_SELL)
         {
            if (ask < avgOpen - Gatilho)
            {
               double newSL    = NormalizeDouble(ask + Folgadopreco, _Digits);
               // Trava dupla: SL nunca acima do médio NEM do open da posição individual.
               double ceiling_ = MathMin(avgOpen, posOpen);
               if ((SL == 0 || newSL < SL) && newSL <= ceiling_)
               {
                  Print("AVG: Stop SELL Updated on ", _Symbol);
                  m_trade.SetAsyncMode(true);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }
      }
   }
   m_trade.SetAsyncMode(false);
}

//+-----------------------------------------------------------------+
//|Trailing Stop Bar                                                |
//+-----------------------------------------------------------------+

void TrailingStop_Buy()
  {
      ENUM_TIMEFRAMES tf = (ENUM_TIMEFRAMES)(_RemoteParamsLoaded ? _RemoteBarTimeframe : (int)_TimeframeBarStop);
      MqlRates barRates[];
      ArraySetAsSeries(barRates, true);
      if(CopyRates(_Symbol, tf, 0, 3, barRates) <= 0) return;

      for(int i=PositionsTotal()-1; i>=0; i--) // count all currency pair positions
          {
            string symbol=PositionGetSymbol(i); // get position symbol
            ulong magic = PositionGetInteger(POSITION_MAGIC);

            if (_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY) // if chart symbol equals position symbol
                {
                  // get the ticket number
                  ulong PositionTicket=PositionGetInteger(POSITION_TICKET);
                  PositionSelectByTicket(PositionTicket); //set id position to verify

                  int folga_bar = _RemoteParamsLoaded ? _RemoteBarFolgaStop : _FolgaStop;
                  double LastLow=NormalizeDouble(barRates[1].low - folga_bar * _Point, _Digits);
                  double tp=PositionGetDouble(POSITION_TP);

                  m_trade.PositionModify(PositionTicket,LastLow,tp);
                  Print("Bar Trailing: Stop Updated (TF=", EnumToString(tf), ").");
                }
          }
    }


//------------------------------------------------------------------------------------


void TrailingStop_Sell()
  {
      ENUM_TIMEFRAMES tf = (ENUM_TIMEFRAMES)(_RemoteParamsLoaded ? _RemoteBarTimeframe : (int)_TimeframeBarStop);
      MqlRates barRates[];
      ArraySetAsSeries(barRates, true);
      if(CopyRates(_Symbol, tf, 0, 3, barRates) <= 0) return;

   for(int i=PositionsTotal()-1; i>=0; i--) // count all currency pair positions
      {
         string symbol=PositionGetSymbol(i); // get position symbol
          ulong magic = PositionGetInteger(POSITION_MAGIC);

         if (_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL) // if chart symbol equals position symbol
            {
               // get the ticket number
                ulong PositionTicket=PositionGetInteger(POSITION_TICKET);
               PositionSelectByTicket(PositionTicket); //set id position to verify

               int folga_bar2 = _RemoteParamsLoaded ? _RemoteBarFolgaStop : _FolgaStop;
               double LastHigh=NormalizeDouble(barRates[1].high + folga_bar2 * _Point, _Digits);
                double tp=PositionGetDouble(POSITION_TP);

                m_trade.PositionModify(PositionTicket,LastHigh,tp);
                Print("Bar Trailing: Stop Updated (TF=", EnumToString(tf), ").");
            }
      }
    }

//+-----------------------------------------------------------------+
//|Break even AVG Price                                             |
//+-----------------------------------------------------------------+

void BreakEvenAvg()
{
   if (_PanelBreakEvenAvg && Posicionado())
   {
      for (int i = 0; i < PositionsTotal(); i++)
      {
         ulong positionTicket = PositionGetTicket(i);
         if (!PositionSelectByTicket(positionTicket))
            continue;

         string positionSymbol = PositionGetString(POSITION_SYMBOL);
         if (positionSymbol != _Symbol)
            continue;

         ulong magic = PositionGetInteger(POSITION_MAGIC);
         if (magic != Magic_Number)
            continue;

         ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         double priceOpen    = (posType == POSITION_TYPE_BUY) ? getAveragePrice_Buy() : getAveragePrice_Sell();
         double gatilho      = NormalizeDouble((_RemoteParamsLoaded ? _RemoteBreakEvenAvgDistance : _BreakEvenTriggerAvg) * _Point, _Digits);
         double folgadopreco = NormalizeDouble((_RemoteParamsLoaded ? _RemoteBreakEvenAvgGain     : _StopGainBreakEven)   * _Point, _Digits);
         double SL           = m_position.StopLoss();

         if (posType == POSITION_TYPE_BUY)
         {
            if (bid > priceOpen + gatilho)
            {
               double newSL = NormalizeDouble(priceOpen + folgadopreco, _Digits);
               if (SL == 0 || newSL > SL)
               {
                  m_trade.SetAsyncMode(true);
                  Print("BreakEven Avg: Stop BUY updated on ", _Symbol);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }
         else if (posType == POSITION_TYPE_SELL)
         {
            if (ask < priceOpen - gatilho)
            {
               double newSL = NormalizeDouble(priceOpen - folgadopreco, _Digits);
               if (SL == 0 || newSL < SL)
               {
                  m_trade.SetAsyncMode(true);
                  Print("BreakEven Avg: Stop SELL updated on ", _Symbol);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }
      }
   }
   m_trade.SetAsyncMode(false);
}

//+-----------------------------------------------------------------+
//|Break even pontos                                                |
//+-----------------------------------------------------------------+

void BreakEven()
{
   if ((_RemoteParamsLoaded ? _RemoteBreakEvenPtsEnabled : _AllowBreakEven) && Posicionado())
   {
      for (int i = 0; i < PositionsTotal(); i++)
      {
         ulong positionTicket = PositionGetTicket(i);
         if (!PositionSelectByTicket(positionTicket))
            continue;

         string positionSymbol = PositionGetString(POSITION_SYMBOL);
         if (positionSymbol != _Symbol)
            continue;

         ulong magic = PositionGetInteger(POSITION_MAGIC);
         if (magic != Magic_Number)
            continue;

         ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         double priceOpen    = PositionGetDouble(POSITION_PRICE_OPEN);
         double gatilho      = NormalizeDouble((_RemoteParamsLoaded ? _RemoteBreakEvenPtsDistance : _BreakEvenTrigger)     * _Point, _Digits);
         double folgadopreco = NormalizeDouble((_RemoteParamsLoaded ? _RemoteBreakEvenPtsGain     : _StopGainBreakEvenPts) * _Point, _Digits);
         double SL           = m_position.StopLoss();

         if (posType == POSITION_TYPE_BUY)
         {
            if (bid > priceOpen + gatilho)
            {
               double newSL = NormalizeDouble(priceOpen + folgadopreco, _Digits);
               if (SL == 0 || newSL > SL)
               {
                  m_trade.SetAsyncMode(true);
                  Print("BreakEven Pts: Stop BUY updated on ", _Symbol);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }
         else if (posType == POSITION_TYPE_SELL)
         {
            if (ask < priceOpen - gatilho)
            {
               double newSL = NormalizeDouble(priceOpen - folgadopreco, _Digits);
               if (SL == 0 || newSL < SL)
               {
                  m_trade.SetAsyncMode(true);
                  Print("BreakEven Pts: Stop SELL updated on ", _Symbol);
                  if (!m_trade.PositionModify(positionTicket, newSL, m_position.TakeProfit()))
                     Print("Error modifying position: ", m_trade.ResultRetcodeDescription());
               }
            }
         }
      }
   }
   m_trade.SetAsyncMode(false);
}


//+-----------------------------------------------------------------+
//|Novo Candle                                                      |
//+-----------------------------------------------------------------+


bool NovoCandle(datetime p_time_candle_atual){
  if(p_time_candle_atual > time_novo_candle){
        p_time_candle_atual = p_time_candle_atual;
        return true;
  }
  return false;
}


//+-----------------------------------------------------------------+
//|CutGain -  Identificando a hora de zerar                         |
//+-----------------------------------------------------------------+


void getFloatingProfit()
  {
        double result = 0.00;
        double position_profit;
      
         for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
          {
               string symbol=PositionGetSymbol(i); // get position symbol
               ulong positionTicket=PositionGetTicket(i); // get the ticket number
               PositionSelectByTicket(positionTicket); //set id position to verify         
              ulong magic = PositionGetInteger(POSITION_MAGIC);// MagicNumber da posição
               //Print("···············  Magic --> ", magic," magic input ->",Magic_Number," magic nativo ->",POSITION_MAGIC);
        
              if( _Symbol == symbol && magic == Magic_Number )
                {
                    position_profit = PositionGetDouble(POSITION_PROFIT);
                    result += position_profit;
                    ;
                  
            }
          }
          
           // Print("···············  PROFIT --> ", result);
          
          if(result >= CutGain)
              {             
                    
                        Close_All();
                        Print("## Don't forget, good profit is profit in your pocket! ##");
                    
              }
      
            if(result <= CutLoss*-1)
              {   
                  Close_All();
                  Print("## LOSS PROPERLY LOCKED ##");
                  
              }
        }

  

//+-----------------------------------------------------------------+
//|CutGain - Zerando tudo ( posições e ordens)                      |
//+-----------------------------------------------------------------+


void CloseAllPositions(){

   for(int i = PositionsTotal() - 1; i >= 0; i--) // loop all Open Positions
      {
         if(m_position.SelectByIndex(i))  // select a position
          {
               m_trade.PositionClose(m_position.Ticket()); // then delete it --period
          }
      }

      CancelOrders();
  }

//+-----------------------------------------------------------------+
//|Cancelar ordens                                                  |
//+-----------------------------------------------------------------+


void CancelOrders(){

    for(int i = OrdersTotal() - 1; i >= 0; i--) // loop all orders available
      {
         if(m_order.SelectByIndex(i))  // select an order
          {
               m_trade.OrderDelete(m_order.Ticket()); // delete it --Period
          }
      }

}


//+-----------------------------------------------------------------+
//|Verificador  de Posições                                         |
//+-----------------------------------------------------------------+

bool Posicionado(){

  for(int i=0; i<PositionsTotal();  i++){
      
      ulong _ticket  = PositionGetTicket(i);
      ulong _magic   = PositionGetInteger(POSITION_MAGIC);
      string _symbol = PositionGetString(POSITION_SYMBOL);
      
      if(Symbol() == _symbol && Magic_Number == _magic){
      return true;      
      
      }
  }
    return false;
}
//+-----------------------------------------------------------------+
//|Verificador  de Ordens                                           |
//+-----------------------------------------------------------------+

bool Pendurado(){
  
    for(int i=0; i<OrdersTotal(); i++){
      
      ulong _Orderticket  = OrderGetTicket(i);
      ulong _Ordermagic   = OrderGetInteger(ORDER_MAGIC);
      string _Ordersymbol = OrderGetString(ORDER_SYMBOL);
      
      if(Symbol() == _Ordersymbol && Magic_Number == _Ordermagic){
      return true;      
      
      }
  }
  
  return false;
}

//+-----------------------------------------------------------------+
//|Verificar se está comprado                                       |
//+-----------------------------------------------------------------+

bool Comprado(){
  for(int i=0; i<PositionsTotal();  i++){
      
      ulong _ticket  = PositionGetTicket(i);
      ulong _magic   = PositionGetInteger(POSITION_MAGIC);
      string _symbol = PositionGetString(POSITION_SYMBOL);
      
      if(Symbol() == _symbol && Magic_Number == _magic && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY ){
      return true;      
      
      }
  }
    return false;
}

//+-----------------------------------------------------------------+
//|Verificar se está vendido                                        |
//+-----------------------------------------------------------------+

bool Vendido(){

  for(int i=0; i<PositionsTotal();  i++){
      
      ulong _ticket  = PositionGetTicket(i);
      ulong _magic   = PositionGetInteger(POSITION_MAGIC);
      string _symbol = PositionGetString(POSITION_SYMBOL);
      
      if(Symbol() == _symbol && Magic_Number == _magic && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL ){
      return true;      
      
      }
  }
    return false;
}

//+-----------------------------------------------------------------+
//|     Fechar tudo                                                 |
//+-----------------------------------------------------------------+
  
  
void Close_All()
  {

  m_trade.SetAsyncMode(true);
   for(int i = PositionsTotal() - 1; i >= 0; i--) // loop all Open Positions
    {
      if(m_position.SelectByIndex(i))  // select a position
        {
         string symbol=PositionGetSymbol(i); // get position symbol
        ulong magic = PositionGetInteger(POSITION_MAGIC);

        if(_Symbol==symbol && magic == Magic_Number)
          {
            m_trade.PositionClose(m_position.Ticket()); // then delete it --period
          }
        }
  }

   for(int i = OrdersTotal() - 1; i >= 0; i--) // loop all orders available
    {
      if(m_order.SelectByIndex(i))  // select an order
        {
        string symbol=OrderGetString(ORDER_SYMBOL); // get position symbol
        ulong magic = OrderGetInteger(ORDER_MAGIC);

        if(_Symbol==symbol && magic == Magic_Number)
          {
            m_trade.OrderDelete(m_order.Ticket()); // delete it --Period
          }
        }
    }
  
  m_trade.SetAsyncMode(false);
  Sleep(200);
  }
  
//+-----------------------------------------------------------------+
//|     Mostrador P&L                                               |
//+-----------------------------------------------------------------+

double getFloatingProfit_value()
  {
  double position_profit;
  double floatingBuy = 0.00;

   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number )
        {
            position_profit = PositionGetDouble(POSITION_PROFIT);
            floatingBuy += position_profit;
        }  
    }
    floatingBuy = NormalizeDouble(floatingBuy, 2);
    return floatingBuy;
  }

//+-----------------------------------------------------------------+
//--- Para Mudança de Candle                                        |
//+-----------------------------------------------------------------+

bool isNewCandleBar()
  {
//--- memoriza o tempo de abertura da ultima barra (vela) numa variável
    static datetime last_time=0;
//--- tempo atual
    datetime lastbar_time= (datetime) SeriesInfoInteger(Symbol(),Period(),SERIES_LASTBAR_DATE);

//--- se for a primeira chamada da função:
    if(last_time==0)
      {
      //--- atribuir valor temporal e sair
      last_time=lastbar_time;
      return(false);
      }

//--- se o tempo estiver diferente:
    if(last_time!=lastbar_time)
      {
      //--- memorizar esse tempo e retornar true
      last_time=lastbar_time;
      return(true);
      }
//--- se passarmos desta linha, então a barra não é nova; retornar false
    return(false);
  }

//+-----------------------------------------------------------------+
//   Atualização da entrada                                         |
//+-----------------------------------------------------------------+


void Refresh_Buy()
  {
      for(int i=OrdersTotal()-1; i>=0; i--) // count all currency pair positions
        {
            string symbol=OrderGetString(ORDER_SYMBOL); // get position symbol  
            ulong magic = OrderGetInteger(ORDER_MAGIC);
            
            if (_Symbol==symbol && magic == Magic_Number && OrderGetInteger(ORDER_TYPE)==ORDER_TYPE_BUY_STOP) // if chart symbol equals position symbol
              {
                // get the ticket number
                  ulong OrderTicket=OrderGetInteger(ORDER_TICKET);
                // Calcula o preço para a ordem pendente de compra
                int folga_ref_buy = _RemoteParamsLoaded ? _RemoteBarFolgaStop : _FolgaStop;
                double Preco_compra = NormalizeDouble(HighMicro[1] + folga_ref_buy * _Point, _Digits);
                // Calcula o preço para o takeprofit
                double Alvo_compra = NormalizeDouble(Preco_compra + _take_Inicial * _Point, _Digits);
                // Calcula o preço para o stoploss
                double StopLossCompra = NormalizeDouble(Preco_compra - _StopInicial * _Point, _Digits);
                // modify the Buy Limit Orders
                m_trade.OrderModify(OrderTicket,Preco_compra, StopLossCompra, Alvo_compra, ORDER_TIME_DAY , 0); // Entrada de compra
                Print("Buy entry updated.");
              }
        }
    }


//------------------------------------------------------------------------------------


void Refresh_Sell()
  {
      for(int i=OrdersTotal()-1; i>=0; i--) // count all currency pair orders
        {
            string symbol=OrderGetString(ORDER_SYMBOL); // get position symbol  
            ulong magic = OrderGetInteger(ORDER_MAGIC);
          
          if (_Symbol==symbol && magic == Magic_Number && OrderGetInteger(ORDER_TYPE)==ORDER_TYPE_SELL_STOP) // if chart symbol equals position symbol
            { // get the ticket number
              ulong OrderTicket=OrderGetInteger(ORDER_TICKET);
              // Calcula o preço para a ordem pendente de venda
              int folga_ref_sell = _RemoteParamsLoaded ? _RemoteBarFolgaStop : _FolgaStop;
              double Preco_venda = NormalizeDouble(LowMicro[1] - folga_ref_sell * _Point, _Digits);
              // Calcula o preço para o takeprofit
              double Alvo_venda = NormalizeDouble(Preco_venda - _take_Inicial * _Point, _Digits);
              // Calcula o preço para o stoploss
              double StopLossVenda = NormalizeDouble(Preco_venda + _StopInicial * _Point, _Digits);
              // modify the Sell Limit Order
              m_trade.OrderModify(OrderTicket,Preco_venda, StopLossVenda, Alvo_venda, ORDER_TIME_DAY , 0); // Entrada de compra
              Print("Sell entry updated.");
            }
      }
    }

//+----------------------------------------------------------------------------------+
//|                Alavancagem automática                                            |
//+----------------------------------------------------------------------------------+

//+------------------------------------------------------------------+
//|      Add - Mantendo um gap do médio                              |
//+------------------------------------------------------------------+

void AddcFunction()
{
  if(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY )
    { 
      // Calcula o preço para a ordem pendente de compra
      double Preco_compra = ask;
      // Calcula o preço para o takeprofit
      double Alvo_compra = NormalizeDouble(Preco_compra + _take_Inicial * _Point, _Digits);
      // Calcula o preço para o stoploss
      double StopLossCompra = NormalizeDouble(Preco_compra - _StopInicial * _Point, _Digits);
      double LastLow=NormalizeDouble(rates[_CandleEdge].low-_FolgaStopAddc * _Point, _Digits);
      double priceOpen = getAveragePrice_Buy();      
      double Folgadopreco = NormalizeDouble(_AddcPointsAvg *_Point, _Digits);
      if ( priceOpen < LastLow )
      {
        if ( bid - priceOpen > Folgadopreco ) 
        {
          m_trade.Buy(_LoteAddc,_Symbol,Preco_compra,StopLossCompra,Alvo_compra,"Market Buy; Addc; Magic: "+(string)Magic_Number); // Entrada de compra 
        }          
      }
    }
        else if (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL )
    { 
      // Calcula o preço para a ordem pendente de venda
      double Preco_venda = bid;
      // Calcula o preço para o takeprofit
      double Alvo_venda = NormalizeDouble(Preco_venda - _take_Inicial * _Point, _Digits);
      // Calcula o preço para o stoploss
      double StopLossVenda = NormalizeDouble(Preco_venda + _StopInicial * _Point, _Digits);
      double LastHigh=NormalizeDouble(rates[_CandleEdge].high+_FolgaStopAddc * _Point, _Digits);
      double priceOpen = getAveragePrice_Sell();
      double Folgadopreco = NormalizeDouble(_AddcPointsAvg *_Point, _Digits);
      if ( priceOpen > LastHigh ) 
      { 
        if ( priceOpen - ask > Folgadopreco)
        {
          m_trade.Sell(_LoteAddc,_Symbol,Preco_venda,StopLossVenda,Alvo_venda,"Market Buy; Addc; Magic: "+(string)Magic_Number); // Entrada de venda
        }
      }
    }

}

//+------------------------------------------------------------------+
//|      Add - Mantendo um gap do médio                              |
//+------------------------------------------------------------------+

void AddFunction() 
  {
    if(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY )
    { 
      // Calcula o preço para a ordem pendente de compra
      double Preco_compra = ask;
      // Calcula o preço para o takeprofit
      double Alvo_compra = NormalizeDouble(Preco_compra + _take_Inicial * _Point, _Digits);
      // Calcula o preço para o stoploss
      double StopLossCompra = NormalizeDouble(Preco_compra - _StopInicial * _Point, _Digits);
      double priceOpen = getAveragePrice_Buy();
      double Gatilho = NormalizeDouble((_RemoteParamsLoaded ? _RemoteAddDistance    : _AddTriggerAvg) * _Point, _Digits);
      double Folgadopreco = NormalizeDouble((_RemoteParamsLoaded ? _RemoteAddAvgDistance : _AddPointsAvg)  * _Point, _Digits);
      if ( bid > priceOpen + Gatilho )
      {
        if ( bid - priceOpen > Folgadopreco ) 
        {
          m_trade.Buy((_RemoteParamsLoaded ? _RemoteAddLot : _LoteAdd),_Symbol,Preco_compra,StopLossCompra,Alvo_compra,"Market Buy; Add; Magic: "+(string)Magic_Number); // Entrada de compra
        }          
      }
    }
  
    else if (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL )
    { 
      // Calcula o preço para a ordem pendente de venda
      double Preco_venda = bid;
      // Calcula o preço para o takeprofit
      double Alvo_venda = NormalizeDouble(Preco_venda - _take_Inicial * _Point, _Digits);
      // Calcula o preço para o stoploss
      double StopLossVenda = NormalizeDouble(Preco_venda + _StopInicial * _Point, _Digits);
      double priceOpen = getAveragePrice_Sell();
      double Gatilho = NormalizeDouble((_RemoteParamsLoaded ? _RemoteAddDistance    : _AddTriggerAvg) * _Point, _Digits);
      double Folgadopreco = NormalizeDouble((_RemoteParamsLoaded ? _RemoteAddAvgDistance : _AddPointsAvg)  * _Point, _Digits);
      if ( ask < priceOpen - Gatilho ) 
      { 
        if ( priceOpen - ask > Folgadopreco)
        {
          m_trade.Sell((_RemoteParamsLoaded ? _RemoteAddLot : _LoteAdd),_Symbol,Preco_venda,StopLossVenda,Alvo_venda,"Market Buy; Add; Magic: "+(string)Magic_Number); // Entrada de venda
        }
      }
    }
  }





//+----------------------------------------------------------------------------------+
//|                GRID DE ORDENS                                                    |
//+----------------------------------------------------------------------------------+

//+------------------------------------------------------------------+
//|      Multiplicador do lote                                       |
//+------------------------------------------------------------------+
int countDecimalDigits(double number) {
    int count = 0;
    while(number != (int)number) {
        count++;
        number *= 10;
    }
    return count;
}

//+------------------------------------------------------------------+
//|         Lote linear - Grid à Favor                               |
//+------------------------------------------------------------------+
double GetLoteLinearAhead(ENUM_POSITION_TYPE tipo)
{
   int quantidade = (tipo == POSITION_TYPE_BUY)
                    ? getPositionsQuantity(POSITION_TYPE_BUY).buyQuantity
                    : getPositionsQuantity(POSITION_TYPE_SELL).sellQuantity;

   double loteBase   = _RemoteParamsLoaded ? _RemoteGridContraLot        : _LoteAddGrid;
   double multiplier = _RemoteParamsLoaded ? _RemoteGridAheadMultiplier  : _multiplicatorAhead;
   double incremento = loteBase * (multiplier - 1);
   double lote = loteBase + quantidade * incremento;

   return NormalizeDouble(lote, (int)volumeDigits);
}

//+------------------------------------------------------------------+
//|         Lote linear - Grid Contra                                |
//+------------------------------------------------------------------+
double GetLoteLinear(ENUM_POSITION_TYPE tipo)
{
   int quantidade = (tipo == POSITION_TYPE_BUY)
                    ? getPositionsQuantity(POSITION_TYPE_BUY).buyQuantity
                    : getPositionsQuantity(POSITION_TYPE_SELL).sellQuantity;

   double loteBase   = _RemoteParamsLoaded ? _RemoteGridContraLot        : _LoteAddGrid;
   double multiplier = _RemoteParamsLoaded ? _RemoteGridContraMultiplier : _multiplicator;
   double incremento = loteBase * (multiplier - 1);
   double lote = loteBase + quantidade * incremento;

   return NormalizeDouble(lote, (int)volumeDigits);
}

//+------------------------------------------------------------------+
//|                 Grid Buy Contra                                  |
//+------------------------------------------------------------------+
void GridFunction_Buy()
{
   uint   total = PositionsTotal();
   string symbol;
   ulong  magic;

   if(total > 0)
   {
      for(int i = (int)total - 1; i >= 0; i--)
      {
         m_position.SelectByIndex(i);
         magic  = m_position.Magic();
         symbol = m_position.Symbol();

         if(_Symbol == symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
         {
            double dist = _RemoteParamsLoaded ? _RemoteGridContraDistance : _distance;
            double _distance_ = NormalizeDouble(dist * _Point, _Digits);

            if(ask < (m_position.PriceOpen() - _distance_) && (currentSpread < _maxSpread))
            {
               double lote = GetLoteLinear(POSITION_TYPE_BUY);

               m_trade.Buy(lote, _Symbol, ask,
                  NormalizeDouble(bid - _StopInicial * _Point, _Digits),
                  NormalizeDouble(ask + _take_Inicial * _Point, _Digits),
                  "Market Buy; Grid; Magic: " + (string)Magic_Number);
            }
            break;
         }
      }
   }
}

//+------------------------------------------------------------------+
//|              Grid Sell Contra                                    |
//+------------------------------------------------------------------+
void GridFunction_Sell()
{
   uint   total = PositionsTotal();
   string symbol;
   ulong  magic;

   if(total > 0)
   {
      for(int i = (int)total - 1; i >= 0; i--)
      {
         m_position.SelectByIndex(i);
         magic  = m_position.Magic();
         symbol = m_position.Symbol();

         if(_Symbol == symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
         {
            double dist = _RemoteParamsLoaded ? _RemoteGridContraDistance : _distance;
            double _distance_ = NormalizeDouble(dist * _Point, _Digits);

            if(bid > (m_position.PriceOpen() + _distance_) && (currentSpread < _maxSpread))
            {
               double lote = GetLoteLinear(POSITION_TYPE_SELL);

               m_trade.Sell(lote, _Symbol, bid,
                  NormalizeDouble(ask + _StopInicial * _Point, _Digits),
                  NormalizeDouble(bid - _take_Inicial * _Point, _Digits),
                  "Market Sell; Grid; Magic: " + (string)Magic_Number);
            }
            break;
         }
      }
   }
}

//+------------------------------------------------------------------+
//|                 Grid Buy à favor                                 |
//+------------------------------------------------------------------+
void GridFunction_Buy_ahead()
{
   uint   total = PositionsTotal();
   string symbol;
   ulong  magic;

   if(total > 0)
   {
      for(int i = (int)total - 1; i >= 0; i--)
      {
         m_position.SelectByIndex(i);
         magic  = m_position.Magic();
         symbol = m_position.Symbol();

         if(_Symbol == symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
         {
            double dist = _RemoteParamsLoaded ? _RemoteGridAheadDistance : _distanceAhead;
            double _distance_ = NormalizeDouble(dist * _Point, _Digits);

            if(ask > (m_position.PriceOpen() + _distance_) && (currentSpread < _maxSpread))
            {
               double lote = GetLoteLinearAhead(POSITION_TYPE_BUY);

               m_trade.Buy(lote, _Symbol, ask,
                  NormalizeDouble(bid - _StopInicial * _Point, _Digits),
                  NormalizeDouble(ask + _take_Inicial * _Point, _Digits),
                  "Market Buy; Add; Magic: " + (string)Magic_Number);
            }
            break;
         }
      }
   }
}

//+------------------------------------------------------------------+
//|               GriD Sell à favor                                  |
//+------------------------------------------------------------------+
void GridFunction_Sell_ahead()
{
   uint   total = PositionsTotal();
   string symbol;
   ulong  magic;

   if(total > 0)
   {
      for(int i = (int)total - 1; i >= 0; i--)
      {
         m_position.SelectByIndex(i);
         magic  = m_position.Magic();
         symbol = m_position.Symbol();

         if(_Symbol == symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
         {
            double dist = _RemoteParamsLoaded ? _RemoteGridAheadDistance : _distanceAhead;
            double _distance_ = NormalizeDouble(dist * _Point, _Digits);

            if(bid < (m_position.PriceOpen() - _distance_) && (currentSpread < _maxSpread))
            {
               double lote = GetLoteLinearAhead(POSITION_TYPE_SELL);

               m_trade.Sell(lote, _Symbol, bid,
                  NormalizeDouble(ask + _StopInicial * _Point, _Digits),
                  NormalizeDouble(bid - _take_Inicial * _Point, _Digits),
                  "Market Sell, Add; Magic: " + (string)Magic_Number);
            }
            break;
         }
      }
   }
}

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
PositionInfo getOrdersQuantity()
{
  PositionInfo info;
  info.buyQuantity = 0;
  info.sellQuantity = 0;

  for (int i = 0; i < OrdersTotal(); i++) {

    // Gets the order ticket
    ulong ticket = OrderGetTicket(i);
    
    if(OrderSelect(ticket)){
       string symbol = m_order.Symbol();
       ulong magic = m_order.Magic();
       int type = m_order.OrderType();
   
       if (_Symbol == symbol && magic == Magic_Number) {
         if ( type == ORDER_TYPE_BUY_STOP ) {
           info.buyQuantity++;
         } else if( type == ORDER_TYPE_SELL_STOP ){
            info.sellQuantity++;            
         }
       }
    }
  }
  
  return info;
}

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
PositionInfo getPositionsQuantity(int positionType)
{
  PositionInfo info;
  info.buyQuantity = 0;
  info.sellQuantity = 0;

  for (int i = 0; i < PositionsTotal(); i++) {
    string symbol = PositionGetSymbol(i);
    ulong positionTicket = PositionGetTicket(i);
    PositionSelectByTicket(positionTicket);
    ulong magic = m_position.Magic();
    int type = m_position.PositionType();

    if (_Symbol == symbol) {
      if (positionType == POSITION_TYPE_BUY && type == POSITION_TYPE_BUY) {
        info.buyQuantity++;
      } else if (positionType == POSITION_TYPE_SELL && type == POSITION_TYPE_SELL) {
        info.sellQuantity++;
      }
    }
  }
  return info;
}

 //+-----------------------------------------------------------------------------------------------------------------------------+
//|                                              ~~~~~~~~~~~~~ Preço Médio ~~~~~~~~~~~~~~                                        |
//+------------------------------------------------------------------------------------------------------------------------------+     
//+------------------------------------------------------------------+
//|   GET AVERAGE PRICE                                              |
//+------------------------------------------------------------------+
double getAveragePrice()
  {

   double buy_price = 0.0;
   double sell_price = 0.0;
   double net_price = 0.0;
   double buy_lots = 0.00;
   double sell_lots = 0.0;
   double net_lots = 0.0;
   double buy_profit = 0.0;
   double sell_profit = 0.0;
   double net_profit = 0.0;
   int buy_count = 0;
   int sell_count = 0;
   int net_count = 0;
   double average_price = 0.0;
   int pos_total = PositionsTotal();

   for(int i = 0; i < pos_total; i++)
     {
      if(PositionGetSymbol(i) == _Symbol)
        {
         ENUM_POSITION_TYPE pos_type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         if(pos_type == POSITION_TYPE_BUY)
           {
            buy_price += PositionGetDouble(POSITION_PRICE_OPEN) * PositionGetDouble(POSITION_VOLUME);
            buy_lots += PositionGetDouble(POSITION_VOLUME);
            buy_profit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
            buy_count++;
           }
         else
            if(pos_type == POSITION_TYPE_SELL)
              {
               sell_price += PositionGetDouble(POSITION_PRICE_OPEN) * PositionGetDouble(POSITION_VOLUME);
               sell_lots += PositionGetDouble(POSITION_VOLUME);
               sell_profit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
               sell_count++;
              }
        }
     }

   if(buy_price > 0)
      buy_price /= buy_lots;
   if(sell_price > 0)
      sell_price /= sell_lots;

   net_price = buy_price * buy_lots - sell_price * sell_lots;
   net_lots = buy_lots - sell_lots;
   net_profit = buy_profit + sell_profit;
   net_count = buy_count + sell_count;

   if(net_count > 0)
     {
      average_price = net_price / net_lots;
      if(DEBUG)
        {
         Print("pos_total: " + IntegerToString(pos_total)
            + "\nbuy_price: " + DoubleToString(buy_price)
            + "\nbuy_lots: " + DoubleToString(buy_lots)
            + "\nsell_price: " + DoubleToString(sell_price)
            + "\nsell_lots: " + DoubleToString(sell_lots)
            + "\nnet_price: " + DoubleToString(net_price)
            + "\nnet_lots: " + DoubleToString(net_lots)
            + "\naverage_price: " + DoubleToString(average_price)
           );
        }
     }
   else
     {
      return NULL;
     }

   return average_price;

  }
  
  
  
//+------------------------------------------------------------------+
//|   GET AVERAGE PRICE  BUY                                         |
//+------------------------------------------------------------------+
double getAveragePrice_Buy()
  {

   double buy_price = 0.0;
   double net_price = 0.0;
   double buy_lots = 0.00;
   double net_lots = 0.0;
   double buy_profit = 0.0;
   double net_profit = 0.0;
   int buy_count = 0;
   int net_count = 0;
   double average_price = 0.0;
   int pos_total = PositionsTotal();

   for(int i = 0; i < pos_total; i++)
     {
      if(PositionGetSymbol(i) == _Symbol)
        {
         ENUM_POSITION_TYPE pos_type = ( ENUM_POSITION_TYPE )PositionGetInteger( POSITION_TYPE );
         if( pos_type == POSITION_TYPE_BUY )
           {
            buy_price += PositionGetDouble( POSITION_PRICE_OPEN) * PositionGetDouble( POSITION_VOLUME );
            buy_lots += PositionGetDouble( POSITION_VOLUME );
            buy_profit += PositionGetDouble( POSITION_PROFIT )  + PositionGetDouble( POSITION_SWAP );
            buy_count++;
           }
        }
     }

   if(buy_price > 0)
      buy_price /= buy_lots;

   net_price = buy_price * buy_lots;
   net_lots = buy_lots;
   net_profit = buy_profit;
   net_count = buy_count;
   _BuyLote = buy_lots;

   if(net_count > 0)
     {
      average_price = net_price / net_lots;
      if(DEBUG)
        {
         Print("pos_total: " + IntegerToString(pos_total)
            + "\nbuy_price: " + DoubleToString(buy_price)
            + "\nbuy_lots: " + DoubleToString(buy_lots)
            + "\nnet_price: " + DoubleToString(net_price)
            + "\nnet_lots: " + DoubleToString(net_lots)
            + "\naverage_price: " + DoubleToString(average_price)
           );
        }
     }
   else
     {
      return NULL;
     }
  
   return average_price;


  }
  
  

//+------------------------------------------------------------------+
//|   GET AVERAGE PRICE SELL                                         |
//+------------------------------------------------------------------+
double getAveragePrice_Sell()
  {

   double sell_price = 0.0;
   double net_price = 0.0;
   double sell_lots = 0.0;
   double net_lots = 0.0;
   double sell_profit = 0.0;
   double net_profit = 0.0;
   int sell_count = 0;
   int net_count = 0;
   double average_price = 0.0;
   int pos_total = PositionsTotal();

   for(int i = 0; i < pos_total; i++)
     {
      if(PositionGetSymbol(i) == _Symbol)
        {
         ENUM_POSITION_TYPE pos_type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         if(pos_type == POSITION_TYPE_SELL)
           {
            sell_price += PositionGetDouble(POSITION_PRICE_OPEN) * PositionGetDouble(POSITION_VOLUME);
            sell_lots += PositionGetDouble(POSITION_VOLUME);
            sell_profit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
            sell_count++;
           }
        }
     }
     
   if(sell_price > 0)
      sell_price /= sell_lots;

   net_price = sell_price * sell_lots;
   net_lots = sell_lots;
   net_profit = sell_profit;
   net_count = sell_count;
   _SellLote = sell_lots;

   if(net_count > 0)
     {
      average_price = net_price / net_lots;
      if(DEBUG)
        {
         Print("pos_total: " + IntegerToString(pos_total)
            + "\nsell_price: " + DoubleToString(sell_price)
            + "\nsell_lots: " + DoubleToString(sell_lots)
            + "\nnet_price: " + DoubleToString(net_price)
            + "\nnet_lots: " + DoubleToString(net_lots)
            + "\naverage_price: " + DoubleToString(average_price)
           );
        }
     }
   else
     {
      return NULL;
     }
   return average_price;

  }
  

//+------------------------------------------------------------------+
//|   BUY - REFRESH AVERAGE PRICE LINE                               |
//+------------------------------------------------------------------+
void refresh_average_line_buy(const long chart_id=0)
  {

  double buy_price = 0.0;
  double net_price = 0.0;
  double buy_lots = 0.00;
  double net_lots = 0.0;
  double buy_profit = 0.0;
  double net_profit = 0.0;
  int buy_count = 0;
  int net_count = 0;
  double average_price = 0.0;
  string line_name = PREFIX_AVERAGE_PRICE_LINE + " de compra";
  string label_name = PREFIX_AVERAGE_PRICE_LABEL + " de compra";
  int pos_total = PositionsTotal();
  int label_x, label_y;

    for(int i = 0; i <= pos_total; i++)
      {
      if(PositionGetSymbol(i) == _Symbol)
        {
          ENUM_POSITION_TYPE pos_type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
          if(pos_type == POSITION_TYPE_BUY)
            {
            buy_price += PositionGetDouble(POSITION_PRICE_OPEN) * PositionGetDouble(POSITION_VOLUME);
            buy_lots += PositionGetDouble(POSITION_VOLUME);
            buy_profit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
            buy_count++;
            }            
        }
      }

    if(buy_price > 0)
      buy_price /= buy_lots;

   net_price = buy_price * buy_lots;
    net_lots = buy_lots ;
    net_profit = buy_profit;
    net_count = buy_count;

    if(net_count > 0)
      {
      average_price = net_price / net_lots;
      if(DEBUG)
        {
          Print("pos_total: " + IntegerToString(pos_total)
            + "\nbuy_price: " + DoubleToString(buy_price)
            + "\nbuy_lots: " + DoubleToString(buy_lots)
            + "\nnet_price: " + DoubleToString(net_price)
            + "\nnet_lots: " + DoubleToString(net_lots)
            + "\naverage_price: " + DoubleToString(average_price)
            );
        }
     }
   else
     {
      ObjectDelete(chart_id, line_name);
      ObjectDelete(chart_id, label_name);
      return;
     }

// draw average price line
   if(!ObjectCreate(chart_id, line_name, OBJ_HLINE,0, 0, average_price))
     {
      Print(__FUNCTION__,
            ": failed to create a horizontal line! Error code = ", GetLastError());
      return;
     }
   ObjectSetInteger(chart_id, line_name, OBJPROP_COLOR, indicator_color1);
   ObjectSetInteger(chart_id, line_name, OBJPROP_STYLE, indicator_style1);
   ObjectSetInteger(chart_id, line_name, OBJPROP_WIDTH, indicator_width1);
   ObjectSetInteger(chart_id, line_name, OBJPROP_BACK, true);
   ObjectSetInteger(chart_id, line_name, OBJPROP_HIDDEN, false);

// draw average price info
  if(!ObjectCreate(chart_id, label_name, OBJ_LABEL,0, 0, 0, 0, 0))
    {
      Print(__FUNCTION__,
            ": failed to create a label! Error code = ", GetLastError());
      return;
    }
    ObjectSetString(chart_id, label_name, OBJPROP_TEXT,
                  ("                                            Size")
//+ DoubleToString(average_price, _Digits)
                  + " - " + DoubleToString(MathAbs(net_lots), 2) + " Buy ");
    ObjectSetString(chart_id, label_name, OBJPROP_FONT, "Arial");
    ObjectSetInteger(chart_id, label_name, OBJPROP_FONTSIZE, 12);
    ObjectSetInteger(chart_id, label_name, OBJPROP_COLOR, clrWhite);
    ObjectSetInteger(chart_id, label_name, OBJPROP_CORNER, 3);  
    ChartTimePriceToXY(chart_id, 0, TimeCurrent(), average_price, label_x, label_y);
    ObjectSetInteger(chart_id, label_name, OBJPROP_XDISTANCE, label_x);
    ObjectSetInteger(chart_id, label_name, OBJPROP_YDISTANCE, label_y);

  return;
  }



//+------------------------------------------------------------------+
//|  SELL - REFRESH AVERAGE PRICE LINE                               |
//+------------------------------------------------------------------+
void refresh_average_line_sell(const long chart_id=0)
  {

    double sell_price = 0.0;
    double net_price = 0.0;
    double sell_lots = 0.0;
    double net_lots = 0.0;
    double sell_profit = 0.0;
    double net_profit = 0.0;
    int sell_count = 0;
    int net_count = 0;
    double average_price = 0.0;
    string line_name = PREFIX_AVERAGE_PRICE_LINE + " de venda";
    string label_name = PREFIX_AVERAGE_PRICE_LABEL + " de venda";
    int pos_total = PositionsTotal();
    int label_x, label_y;

  for(int i = 0; i < pos_total; i++)
    {
      if(PositionGetSymbol(i) == _Symbol)
        {
        ENUM_POSITION_TYPE pos_type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
        if(pos_type == POSITION_TYPE_SELL)
          {
              sell_price += PositionGetDouble(POSITION_PRICE_OPEN) * PositionGetDouble(POSITION_VOLUME);
              sell_lots += PositionGetDouble(POSITION_VOLUME);
              sell_profit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
              sell_count++;
            }
        }
    }

  if(sell_price > 0)
      sell_price /= sell_lots;

  net_price = sell_price * sell_lots;
  net_lots = sell_lots;
  net_profit = sell_profit;
  net_count = sell_count;

  if(net_count > 0)
    {
      average_price = net_price / net_lots;
      if(DEBUG)
        {
         Print("pos_total: " + IntegerToString(pos_total)
            + "\nsell_price: " + DoubleToString(sell_price)
            + "\nsell_lots: " + DoubleToString(sell_lots)
            + "\nnet_price: " + DoubleToString(net_price)
            + "\nnet_lots: " + DoubleToString(net_lots)
            + "\naverage_price: " + DoubleToString(average_price)
           );
        }
     }
   else
     {
      ObjectDelete(chart_id, line_name);
      ObjectDelete(chart_id, label_name);
      return;
     }

// draw average price line
  if(!ObjectCreate(chart_id, line_name, OBJ_HLINE,0, 0, average_price))
    {
      Print(__FUNCTION__,
            ": failed to create a horizontal line! Error code = ", GetLastError());
      return;
    }
  ObjectSetInteger(chart_id, line_name, OBJPROP_COLOR, indicator_color2);
  ObjectSetInteger(chart_id, line_name, OBJPROP_STYLE, indicator_style1);
  ObjectSetInteger(chart_id, line_name, OBJPROP_WIDTH, indicator_width1);
  ObjectSetInteger(chart_id, line_name, OBJPROP_BACK, true);
  ObjectSetInteger(chart_id, line_name, OBJPROP_HIDDEN, false);

// draw average price info
  if(!ObjectCreate(chart_id, label_name, OBJ_LABEL,0, 0, 0, 0, 0))
    {
      Print(__FUNCTION__,
            ": failed to create a label! Error code = ", GetLastError());
      return;
    }
  ObjectSetString(chart_id, label_name, OBJPROP_TEXT,
                  ("                                            Size")
//+ DoubleToString(average_price, _Digits)
                  + " - " + DoubleToString(MathAbs(net_lots), 2) + " Sell ");
    ObjectSetString(chart_id, label_name, OBJPROP_FONT, "Arial");
    ObjectSetInteger(chart_id, label_name, OBJPROP_FONTSIZE, 12);
    ObjectSetInteger(chart_id, label_name, OBJPROP_COLOR, clrWhite);
    ObjectSetInteger(chart_id, label_name, OBJPROP_CORNER, 3);
    ChartTimePriceToXY(chart_id, 0, TimeCurrent(), average_price, label_x, label_y);
    ObjectSetInteger(chart_id, label_name, OBJPROP_XDISTANCE, label_x);
    ObjectSetInteger(chart_id, label_name, OBJPROP_YDISTANCE, label_y);

    return;
  }  
//+------------------------------------------------------------------+
//|   GET POSITIONS QUANTITY                                         |
//+------------------------------------------------------------------+


//BUY
//------------------------------------

//return buy orders quantity
int getOrderBuyQty()
  {

//variables
   ulong  positionTicket;
   int    ordersCount = 0;

//loop to verify the last order to calculate the distance across the ask
   for(int i = PositionsTotal()-1; i>=0; i--)
     {

      //select the open position to get infos
      positionTicket=PositionGetTicket(i);
      PositionSelectByTicket(positionTicket);
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      // get position symbol
      string symbol=PositionGetSymbol(i);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
        {
         ordersCount += 1;
        }

     }

   return ordersCount;

  }
  

//SELL
//------------------------------------

//return sell orders quantity
int getOrderSellQty()
  {

//variables
   uint   total = PositionsTotal();
   ulong  positionTicket;
   int    ordersCount = 0;

//loop to verify the last order to calculate the distance across the ask
   for(int i = PositionsTotal()-1; i>=0; i--)
     {

      //select the open position to get infos
      positionTicket=PositionGetTicket(i);
      PositionSelectByTicket(positionTicket);

      // get position symbol
      string symbol=PositionGetSymbol(i);
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
        {
         ordersCount += 1;
        }

     }

   return ordersCount;

  }
 //+-----------------------------------------------------------------------------------------------------------------------------+
//|                                              ~~~~~~~~~~~~~ FIM Preço Médio ~~~~~~~~~~~~~~                                    |
//+------------------------------------------------------------------------------------------------------------------------------+  

//--------------------------------------------------------------------------------------



void Close_All_Buy_Positive(){
   
   double position_profit;

   m_trade.SetAsyncMode(true);
   for(int i = PositionsTotal() - 1; i >= 0; i--) // loop all Open Positions
     {
      if(m_position.SelectByIndex(i))  // select a position
        {
         string symbol=PositionGetSymbol(i); // get position symbol
         ulong magic = PositionGetInteger(POSITION_MAGIC);

         position_profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);

         if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY && position_profit > 0)
           {
            m_trade.PositionClose(m_position.Ticket()); // then delete it --period
           }
        }
     }
   
   m_trade.SetAsyncMode(false);
   Sleep(200);
}


//--------------------------------------------------------------------------------------


void Close_All_Sell_Positive(){

   double position_profit;

   m_trade.SetAsyncMode(true);
   for(int i = PositionsTotal() - 1; i >= 0; i--) // loop all Open Positions
     {
      if(m_position.SelectByIndex(i))  // select a position
        {
         string symbol=PositionGetSymbol(i); // get position symbol
         ulong magic = PositionGetInteger(POSITION_MAGIC);
         position_profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);

         if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL && position_profit > 0)
           {
            m_trade.PositionClose(m_position.Ticket());
           }
        }
     }
     
   m_trade.SetAsyncMode(false);
   Sleep(200);

}

//--------------------------------------------------------------------------------------


void Close_All_Buy(){
   
   m_trade.SetAsyncMode(true);
   for(int i = PositionsTotal() - 1; i >= 0; i--) // loop all Open Positions
     {
      if(m_position.SelectByIndex(i))  // select a position
        {
         string symbol=PositionGetSymbol(i); // get position symbol
         ulong magic = PositionGetInteger(POSITION_MAGIC);

         if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
           {
            m_trade.PositionClose(m_position.Ticket()); // then delete it --period
           }
        }
     }
   
   m_trade.SetAsyncMode(false);
   Sleep(200);
   
}


//--------------------------------------------------------------------------------------


void Close_All_Sell(){
   
   m_trade.SetAsyncMode(true);
   for(int i = PositionsTotal() - 1; i >= 0; i--) // loop all Open Positions
     {
      if(m_position.SelectByIndex(i))  // select a position
        {
         string symbol=PositionGetSymbol(i); // get position symbol
         ulong magic = PositionGetInteger(POSITION_MAGIC);

         if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
           {
            m_trade.PositionClose(m_position.Ticket()); // then delete it --period
           }
        }
     }
   
   m_trade.SetAsyncMode(false);
   Sleep(200);
   
}
//--------------------------------------------------------------------------------------


void Close_All_Positive(){

   double position_profit;

   m_trade.SetAsyncMode(true);
      for(int i = PositionsTotal() - 1; i >= 0; i--) // loop all Open Positions
        {
         if(m_position.SelectByIndex(i))  // select a position
           {
            string symbol=PositionGetSymbol(i); // get position symbol
            ulong magic = PositionGetInteger(POSITION_MAGIC);
            position_profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
   
            if(_Symbol==symbol && magic == Magic_Number && position_profit > 0)
              {
               m_trade.PositionClose(m_position.Ticket()); // then delete it --period
              }
           }
        }
      
      m_trade.SetAsyncMode(false);
      Sleep(200);

};


//------------------------------------------------------------------------------------


void BuyMoveAllStops(double averagePrice)
  {

//Check all open positions for  cgetutherrent symbol
   for(int i = PositionsTotal()-1; i>=0; i--) // count all currency pair positions
     {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      
      PositionSelectByTicket(positionTicket); //set id position to verify

      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
        {
            // modify the stop loss
            m_trade.PositionModify(positionTicket,averagePrice+(_StopGainBreakEven*_Point),m_position.TakeProfit());
        }
     }

  }
  
  
//------------------------------------------------------------------------------------


void SellMoveAllStops(double averagePrice)
  {

//Check all open positions for  cgetutherrent symbol
   for(int i = PositionsTotal()-1; i>=0; i--) // count all currency pair positions
     {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      
      PositionSelectByTicket(positionTicket); //set id position to verify

      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
        {
            // modify the stop loss
            m_trade.PositionModify(positionTicket,averagePrice-(_StopGainBreakEven*_Point),m_position.TakeProfit());
        }
     }

  }
  
  //------------------------------------------------------------------------------------


void CloseGreaterProfit_Buy()
  {
   
      double profit=-1000000;
      ulong  resultTicket = 0;     
      for(int BuyTotalPos=PositionsTotal()-1;BuyTotalPos>=0;BuyTotalPos--)
         {
            string symbol=PositionGetSymbol(BuyTotalPos);
            if(Symbol()==symbol && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
            {
               ulong PositionTicket=PositionGetInteger(POSITION_TICKET);
               PositionSelectByTicket(PositionTicket); //set id position to verify
               
               if(PositionSelectByTicket(PositionTicket))
               {
                     if(PositionGetDouble(POSITION_PROFIT)>profit && PositionGetDouble(POSITION_PROFIT) > 0){
                        profit=PositionGetDouble(POSITION_PROFIT);
                        resultTicket = PositionTicket;
                     }
               }
            }      
         }
         
      if(resultTicket>0)
         {
            m_trade.PositionClose(resultTicket);
         }
      else
        {
            Print("No buy positions in profit!");
        }
  }


//------------------------------------------------------------------------------------


void CloseGreaterProfit_Sell()
  {
   
      double profit=-1000000;
      ulong  resultTicket = 0;     
      for(int SellTotalPos=PositionsTotal()-1;SellTotalPos>=0;SellTotalPos--)
        {
            string symbol=PositionGetSymbol(SellTotalPos);
            if(Symbol()==symbol && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
            {
              ulong PositionTicket=PositionGetInteger(POSITION_TICKET);
               PositionSelectByTicket(PositionTicket); //set id position to verify
              
              if(PositionSelectByTicket(PositionTicket))
              {
                    if(PositionGetDouble(POSITION_PROFIT)>profit && PositionGetDouble(POSITION_PROFIT) > 0){
                        profit=PositionGetDouble(POSITION_PROFIT);
                        resultTicket = PositionTicket;
                    }
              }
            }      
        }
      if(resultTicket>0)
        {
            m_trade.PositionClose(resultTicket);
        }
      else
        {
            Print("No Sell positions in profit!");
        }
  }


//------------------------------------------------------------------------------------


double getFloatingProfit_Buy()
  {
  double position_profit;
  double floatingBuy = 0.00;

   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
        {
            position_profit = PositionGetDouble(POSITION_PROFIT);
            floatingBuy += position_profit;
        }  
    }
     
    return floatingBuy;
  }
  
  
//------------------------------------------------------------------------------------


double getFloatingProfit_Sell()
  {
  double position_profit;
  double floatingSell = 0.00;

   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
        {
            position_profit = PositionGetDouble(POSITION_PROFIT);
            floatingSell += position_profit;
        }  
    }
     
    return floatingSell;
     
  }


//------------------------------------------------------------------------------------


void coverVolume(){

  double totalVolumeBuy = 0.00;
  double totalVolumeSell = 0.00;
  _PanelTrailingAvg = false;
  _PanelBreakEvenAvg = false;
   
   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
        {
            totalVolumeBuy += PositionGetDouble(POSITION_VOLUME);
        } 
      else if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
        {
            totalVolumeSell += PositionGetDouble(POSITION_VOLUME);
        } 
    }
     
    if(totalVolumeBuy > totalVolumeSell){
         
        double difference = totalVolumeBuy - totalVolumeSell;
        m_trade.Sell(difference, _Symbol, ask, NULL, NULL, "COVER SELL");
         
    }else{
     
        double difference = totalVolumeSell - totalVolumeBuy;
        m_trade.Buy(difference, _Symbol, bid, NULL, NULL, "COVER BUY");
     
    }
     
}

//------------------------------------------------------------------------------------


double getBuyTotalVolume(){

  double totalVolumeBuy = 0.00;
   
   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
        {
            totalVolumeBuy += PositionGetDouble(POSITION_VOLUME);
        } 
    }

    return totalVolumeBuy;

}


//------------------------------------------------------------------------------------


double getSellTotalVolume(){

  double totalVolumeSell = 0.00;
  
   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
        {
            totalVolumeSell += PositionGetDouble(POSITION_VOLUME);
        } 
    }
    
    return totalVolumeSell;
    
}


//------------------------------------------------------------------------------------


double getTotalProfit()
  {
   double position_profit;
   double profit = 0.00;

   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number)
        {
            position_profit = PositionGetDouble(POSITION_PROFIT);
            profit += position_profit;
        }  
    }
    
    return profit;
    
  }


//------------------------------------------------------------------------------------


double getNettingVolume(){

  double nettingVolume = 0;
   
   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
      string symbol=PositionGetSymbol(i); // get position symbol
      ulong positionTicket=PositionGetTicket(i); // get the ticket number
      PositionSelectByTicket(positionTicket); //set id position to verify
      ulong magic = PositionGetInteger(POSITION_MAGIC);

      if(_Symbol==symbol && magic == Magic_Number)
        {
            if(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
              {
                  nettingVolume += PositionGetDouble(POSITION_VOLUME);
              }
            else if(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
              {
                  nettingVolume -= PositionGetDouble(POSITION_VOLUME);
              }
        } 
    }
     
    return nettingVolume;

}


//------------------------------------------------------------------------------------


void automaticProtect(){
  double result = 0.00 ;
  double position_profit;

   for(int i=0; i<PositionsTotal(); i++) // count all currency pair positions
    {
        string symbol=PositionGetSymbol(i); // get position symbol
        ulong positionTicket=PositionGetTicket(i); // get the ticket number
        PositionSelectByTicket(positionTicket); //set id position to verify
  
        ulong magic = PositionGetInteger(POSITION_MAGIC);
  
        if(_Symbol==symbol && magic == Magic_Number)
          {
              position_profit = PositionGetDouble(POSITION_PROFIT);
              result += position_profit;
          }
    }

  if(result <= _ValueAutomaticProtect*-1 && protectionlevel == 1)
      {   
        coverVolume();
        Print("First level of protection activated");
        protectionlevel = 2;
        _PanelTrailingAvg = false;
        _PanelBreakEvenAvg = false;

      
      }

  if(result <= _ValueAutomaticProtectTwo*-1 && protectionlevel == 2)
      {   
        coverVolume();
        Print("Second level of protection activated");
        protectionlevel = 3;
        ButtonTwoKey = true;
        _PanelBreakEvenAvg = false;
        
      }
  if(result >= 0 && protectionlevel > 1)
      { 
      Print("Protection restored to first level");
      protectionlevel = 1;         
      }
};


//------------------------------------------------------------------------------------


void ChangeHands()
    {
    
    double nettingVolume = getNettingVolume();
    
      if(nettingVolume < 0)
        {
            Close_All();
            nettingVolume = nettingVolume*-1;
            m_trade.Buy(NormalizeDouble(nettingVolume, 2), _Symbol, bid, NULL, NULL, "Change hands to: Buy."); 
            Print("RESULT Neeting Volume ---> ", nettingVolume);
            
        }
      else if(nettingVolume > 0)
        {
            Close_All();
            m_trade.Sell(NormalizeDouble(nettingVolume, 2), _Symbol, ask, NULL, NULL, "Change hands to: Sell.");
            Print("RESULT Neeting Volume ---> ", nettingVolume); 
        }
      
    }
    
  