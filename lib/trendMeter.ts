// ============================================================
// Trendmeter — transcrição da lógica do indicador MT5 PainelAfkMultiTF.mq5
// para TypeScript puro (sem dependências, testável, roda no browser).
//
// Fonte: mt5/PainelAfkMultiTF.mq5 (OnCalculate + UpdateAnalysis).
// A parte visual (gauge bitmap) foi descartada — aqui está só a LÓGICA:
//   - Canal por TF: MM(period) sobre HIGH e sobre LOW (SMA simples).
//   - Cor do ponteiro (confirmedSignal): OPEN do candio atual vs canal.
//   - Zona do ponteiro (needle): PREÇO ATUAL (mid) vs canal, normalizado -1..+1.
//   - Estado rico: combinação (cor × zona) → 7 estados.
//   - Parecer: cascata top-down TF5→TF4→(TF3+curtos) + super tendência.
// ============================================================

export interface Candle {
  time: number; // epoch ms (opcional para a lógica, útil para ordenar)
  open: number;
  high: number;
  low: number;
  close: number;
}

// 0=Consolidação 1=Em Alta 2=Pullback Alta 3=Em Baixa 4=Pullback Baixa
// 5=Engatando Alta 6=Engatando Baixa  (mesmos códigos do MT5)
export type RichState = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TFResult {
  label: string;        // ex.: 'M15'
  signal: -1 | 0 | 1;   // cor do ponteiro (confirmedSignal)
  needle: number;       // -1..+1 (posição do ponteiro / zona)
  state: RichState;
  channelHigh: number;
  channelLow: number;
  price: number;
}

export interface TrendAnalysis {
  perByTF: TFResult[];  // na ordem TF1..TF5 (curto → longo)
  line1: string;        // parecer — linha de cenário
  line2: string;        // parecer — linha de momento
  bias: -1 | 0 | 1;     // viés consolidado (para colorir / futuros sinais)
  superTrend: 'up' | 'down' | null;
}

// SMA simples do último valor de uma série de preços (PRICE_HIGH ou PRICE_LOW).
// Retorna a média dos últimos `period` valores encerrados incluindo o atual.
function sma(values: number[], period: number, endIndex: number): number {
  if (endIndex < period - 1) return NaN;
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) sum += values[i];
  return sum / period;
}

// Nome curto do estado rico (igual RichStateName no MT5).
export function richStateName(state: RichState): string {
  switch (state) {
    case 1: return 'Em Alta';
    case 2: return 'Pullback Alta';
    case 3: return 'Em Baixa';
    case 4: return 'Pullback Baixa';
    case 5: return 'Engatando Alta';
    case 6: return 'Engatando Baixa';
    default: return 'Consolidação';
  }
}

// Direção do estado: 1 alta, -1 baixa, 0 neutro (igual RichStateDirection).
function richStateDirection(state: RichState): -1 | 0 | 1 {
  if (state === 1 || state === 5) return 1;
  if (state === 3 || state === 6) return -1;
  return 0;
}

// Descrição para os prefixos do parecer (igual TFStateDesc).
function tfStateDesc(state: RichState): string {
  switch (state) {
    case 1: return 'em alta';
    case 3: return 'em baixa';
    case 5: return 'engatando alta';
    case 6: return 'engatando baixa';
    case 2: return 'pullback de alta';
    case 4: return 'pullback de baixa';
    default: return 'neutro';
  }
}

// Analisa UM timeframe a partir de seus candles cronológicos (mais antigo → novo).
// Reproduz o núcleo do OnCalculate do MT5:
//   - canal = SMA(HIGH,period) / SMA(LOW,period) no candle atual
//   - cor (signal) pelo OPEN do candle atual vs canal
//   - needle pelo preço atual (usamos o close do último candle como "mid")
function analyzeTimeframe(label: string, candles: Candle[], period: number): TFResult | null {
  const n = candles.length;
  if (n < period) return null;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const last = n - 1;

  const channelHigh = sma(highs, period, last);
  const channelLow = sma(lows, period, last);
  if (Number.isNaN(channelHigh) || Number.isNaN(channelLow)) return null;

  const candleOpen = candles[last].open;
  // "mid" ao vivo no MT5 é (bid+ask)/2; no histórico usamos o close atual.
  const price = candles[last].close;

  // Cor do ponteiro (confirmedSignal): OPEN vs canal.
  let signal: -1 | 0 | 1 = 0;
  if (candleOpen >= channelHigh) signal = 1;
  else if (candleOpen <= channelLow) signal = -1;

  // Zona / needle: preço vs canal, normalizado -1..+1.
  const range = channelHigh - channelLow;
  let needle: number;
  if (price >= channelHigh) needle = 1;
  else if (price <= channelLow) needle = -1;
  else needle = range > 0 ? ((price - channelLow) / range) * 2 - 1 : 0;

  // Zona discreta (mesmos limiares 0.667 do MT5).
  let zona: -1 | 0 | 1;
  if (needle >= 0.667) zona = 1;
  else if (needle <= -0.667) zona = -1;
  else zona = 0;

  // Estado rico = combinação cor × zona (idêntico ao MT5).
  let state: RichState;
  if (signal === 1 && zona === 1) state = 1;
  else if (signal === 1 && zona === 0) state = 2;
  else if (signal === -1 && zona === -1) state = 3;
  else if (signal === -1 && zona === 0) state = 4;
  else if (signal === 0 && zona === 1) state = 5;
  else if (signal === 0 && zona === -1) state = 6;
  else state = 0;

  return { label, signal, needle, state, channelHigh, channelLow, price };
}

// ─── Motor de parecer (transcrição de UpdateAnalysis + Momento*) ─────────────

function momentoEmAlta(r2: RichState, d0: number, d1: number, tf3: string, tf1: string, tf2: string): string {
  const mom = d0 + d1;
  if (r2 === 1) {
    if (mom === 2) return `${tf3} em alta, curtos confirmam — momentum forte`;
    if (mom === 1) { const tfneu = d0 === 0 ? tf1 : tf2; return `${tf3} em alta, ${tfneu} hesita — tendência intacta`; }
    if (mom === 0) { if (d0 === 0 && d1 === 0) return `${tf3} em alta, ${tf1}/${tf2} laterais`; return `${tf3} em alta, ${tf1}/${tf2} divergentes`; }
    if (mom === -1) { const tfneg = d0 === -1 ? tf1 : tf2; return `${tf3} em alta, ${tfneg} contra — cautela`; }
    return `${tf3} em alta, curtos em queda — aguardar`;
  }
  if (r2 === 2) { if (mom <= 0) return `pullback no ${tf3} com curtos vendidos`; return `pullback no ${tf3} absorvido — retomada possível`; }
  if (r2 === 5) { if (mom >= 1) return `engatando alta no ${tf3}, curtos confirmam`; return `engatando alta no ${tf3} — aguardar curtos`; }
  if (r2 === 3) { if (mom <= -1) return `${tf3} diverge p/ baixo — possível pivot de baixa`; return `${tf3} divergindo p/ baixo — monitorar`; }
  if (r2 === 6) return `${tf3} engatando baixa — possível esgotamento`;
  if (r2 === 4) return `pullback de baixa no ${tf3} — aguardar exaustão`;
  // r2 neutro (0): classifica pelo momentum dos curtos
  if (mom === 2) return `${tf3} neutro, ${tf1}/${tf2} em alta — aguardar romper`;
  if (mom === 1) { const tfp = d0 === 1 ? tf1 : tf2; return `${tf3} neutro, ${tfp} em alta — pressão compradora`; }
  if (mom === -1) { const tfn = d0 === -1 ? tf1 : tf2; return `${tf3} neutro, ${tfn} vendido — pressão contrária`; }
  if (mom === -2) return `${tf3} neutro, curtos em baixa — pressão contrária`;
  if (d0 === 0 && d1 === 0) return `${tf3} neutro — aguardar direção nos curtos`;
  return `${tf3} neutro, ${tf1}/${tf2} divergentes`;
}

function momentoEmBaixa(r2: RichState, d0: number, d1: number, tf3: string, tf1: string, tf2: string): string {
  const mom = d0 + d1;
  if (r2 === 3) {
    if (mom === -2) return `${tf3} em baixa, curtos confirmam — momentum forte`;
    if (mom === -1) { const tfneu = d0 === 0 ? tf1 : tf2; return `${tf3} em baixa, ${tfneu} hesita — tendência intacta`; }
    if (mom === 0) { if (d0 === 0 && d1 === 0) return `${tf3} em baixa, ${tf1}/${tf2} laterais`; return `${tf3} em baixa, ${tf1}/${tf2} divergentes`; }
    if (mom === 1) { const tfpos = d0 === 1 ? tf1 : tf2; return `${tf3} em baixa, ${tfpos} contra — cautela`; }
    return `${tf3} em baixa, curtos subindo — aguardar`;
  }
  if (r2 === 4) { if (mom >= 0) return `pullback no ${tf3} com curtos comprando`; return `pullback no ${tf3} absorvido — queda possível`; }
  if (r2 === 6) { if (mom <= -1) return `engatando baixa no ${tf3}, curtos confirmam`; return `engatando baixa no ${tf3} — aguardar curtos`; }
  if (r2 === 1) { if (mom >= 1) return `${tf3} diverge p/ cima — possível pivot de alta`; return `${tf3} divergindo p/ cima — monitorar`; }
  if (r2 === 5) return `${tf3} engatando alta — possível esgotamento da queda`;
  if (r2 === 2) return `pullback de alta no ${tf3} — aguardar exaustão`;
  if (mom === -2) return `${tf3} neutro, ${tf1}/${tf2} em baixa — aguardar romper`;
  if (mom === -1) { const tfn = d0 === -1 ? tf1 : tf2; return `${tf3} neutro, ${tfn} em baixa — pressão vendedora`; }
  if (mom === 1) { const tfp = d0 === 1 ? tf1 : tf2; return `${tf3} neutro, ${tfp} comprando — pressão contrária`; }
  if (mom === 2) return `${tf3} neutro, curtos em alta — pressão contrária`;
  if (d0 === 0 && d1 === 0) return `${tf3} neutro — aguardar direção nos curtos`;
  return `${tf3} neutro, ${tf1}/${tf2} divergentes`;
}

function momentoMacroNeutro(r2: RichState, d0: number, d1: number, tf3: string, tf1: string, tf2: string): string {
  const mom = d0 + d1;
  if (r2 === 1) {
    if (mom >= 1) return `${tf3} em alta, curtos confirmam — viés comprador`;
    if (mom === 0) { if (d0 === 0 && d1 === 0) return `${tf3} em alta, curtos parados — aguardar`; return `${tf3} em alta, curtos divergentes — aguardar`; }
    return `${tf3} em alta, curtos vendidos — possível pivot alta`;
  }
  if (r2 === 3) {
    if (mom <= -1) return `${tf3} em baixa, curtos confirmam — viés vendedor`;
    if (mom === 0) { if (d0 === 0 && d1 === 0) return `${tf3} em baixa, curtos parados — aguardar`; return `${tf3} em baixa, curtos divergentes — aguardar`; }
    return `${tf3} em baixa, curtos comprando — possível pivot baixa`;
  }
  if (r2 === 5) { if (mom >= 1) return `${tf3} engatando alta, curtos a favor`; return `${tf3} engatando alta — aguardar curtos`; }
  if (r2 === 6) { if (mom <= -1) return `${tf3} engatando baixa, curtos a favor`; return `${tf3} engatando baixa — aguardar curtos`; }
  if (r2 === 2) { if (mom <= -1) return `pullback no ${tf3}, curtos vendidos — sem direção`; return `pullback no ${tf3} — mercado sem definição`; }
  if (r2 === 4) { if (mom >= 1) return `pullback baixa no ${tf3}, curtos compram — sem dir.`; return `pullback de baixa no ${tf3} — sem definição`; }
  if (mom === 2) return `${tf1}/${tf2} em alta, sem respaldo no ${tf3} — fraco`;
  if (mom === 1) { const tfp = d0 === 1 ? tf1 : tf2; return `${tfp} em alta, ${tf3} neutro — aguardar confirmação`; }
  if (mom === -1) { const tfn = d0 === -1 ? tf1 : tf2; return `${tfn} em baixa, ${tf3} neutro — aguardar confirmação`; }
  if (mom === -2) return `${tf1}/${tf2} em baixa, sem respaldo no ${tf3} — fraco`;
  if (d0 === 0 && d1 === 0) return `todos os TFs neutros — aguardar direção`;
  return `${tf3} neutro, ${tf1}/${tf2} divergentes — sem direção`;
}

// Constrói o parecer (cascata top-down) a partir dos 5 estados. Espelha UpdateAnalysis.
function buildAnalysis(states: RichState[], labels: string[]): { line1: string; line2: string; bias: -1 | 0 | 1; superTrend: 'up' | 'down' | null } {
  const [r0, r1, r2, r3, r4] = states;
  const d0 = richStateDirection(r0), d1 = richStateDirection(r1),
        d2 = richStateDirection(r2), d3 = richStateDirection(r3), d4 = richStateDirection(r4);
  const mom = d0 + d1;
  const [tf1, tf2, tf3, tf4, tf5] = labels;

  let text: string;
  let bias: -1 | 0 | 1 = 0;
  let superTrend: 'up' | 'down' | null = null;

  const nAlta = states.filter((s) => s === 1).length;
  const nBaixa = states.filter((s) => s === 3).length;

  if (nAlta === 5) {
    text = 'Super tendência de alta — todos os tempos alinhados, força máxima';
    bias = 1; superTrend = 'up';
  } else if (nBaixa === 5) {
    text = 'Super tendência de baixa — todos os tempos alinhados, força máxima';
    bias = -1; superTrend = 'down';
  } else if (d4 === 1) {
    const pfx5 = `${tf5} ${tfStateDesc(r4)}`;
    text = `${pfx5}, ${tf4} ${tfStateDesc(r3)} — ${momentoEmAlta(r2, d0, d1, tf3, tf1, tf2)}`;
    bias = (d2 === 1 && mom >= 0) ? 1 : (mom <= -1 ? 0 : 1);
  } else if (d4 === -1) {
    const pfx5b = `${tf5} ${tfStateDesc(r4)}`;
    text = `${pfx5b}, ${tf4} ${tfStateDesc(r3)} — ${momentoEmBaixa(r2, d0, d1, tf3, tf1, tf2)}`;
    bias = (d2 === -1 && mom <= 0) ? -1 : (mom >= 1 ? 0 : -1);
  } else {
    const pfx = `Macro indef., ${tf4} ${tfStateDesc(r3)}`;
    text = `${pfx} — ${momentoMacroNeutro(r2, d0, d1, tf3, tf1, tf2)}`;
    bias = d3 === 1 && d2 === 1 && mom >= 1 ? 1 : d3 === -1 && d2 === -1 && mom <= -1 ? -1 : 0;
  }

  // Quebra no " — " (mesma divisão em duas linhas do MT5).
  let line1 = text, line2 = '';
  const sep = text.indexOf(' — ');
  if (sep >= 0) { line1 = text.slice(0, sep); line2 = text.slice(sep + 3); }
  return { line1, line2, bias, superTrend };
}

export interface TrendMeterInput {
  // Candles por TF, na ordem curto→longo (TF1..TF5), cada um cronológico.
  candlesByTF: Candle[][];
  labels: string[];   // ex.: ['M1','M5','M15','H1','D1']
  maPeriod: number;   // período da MM (default MT5 = 8)
}

// Ponto de entrada: recebe candles dos 5 TFs e devolve a análise completa.
export function computeTrendMeter(input: TrendMeterInput): TrendAnalysis {
  const { candlesByTF, labels, maPeriod } = input;
  const perByTF: TFResult[] = [];
  const states: RichState[] = [];

  for (let i = 0; i < labels.length; i++) {
    const res = analyzeTimeframe(labels[i], candlesByTF[i] ?? [], maPeriod);
    if (res) {
      perByTF.push(res);
      states.push(res.state);
    } else {
      // Sem dados suficientes → estado neutro para não quebrar o parecer.
      perByTF.push({ label: labels[i], signal: 0, needle: 0, state: 0, channelHigh: NaN, channelLow: NaN, price: NaN });
      states.push(0);
    }
  }

  const { line1, line2, bias, superTrend } = buildAnalysis(states, labels);
  return { perByTF, line1, line2, bias, superTrend };
}
