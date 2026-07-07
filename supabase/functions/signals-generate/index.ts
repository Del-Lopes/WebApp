// Supabase Edge Function — signals-generate (on-demand, pago em Coins)
//
// Fluxo (uma chamada, do usuário logado):
//   1. Autentica pelo JWT do usuário (Verify JWT LIGADO nesta função).
//   2. Cobra a análise em Coins via RPC charge_signal_analysis (débito
//      transacional no contexto do usuário). Cobra SEMPRE — a análise é
//      entregue com ou sem entrada.
//   3. Puxa candles OHLC do XAU/USD (Twelve Data) + manchetes recentes.
//   4. Calcula indicadores (EMA9/21/50, ATR14) e detecta o setup.
//   5. IA redige o parecer (tendência + indicadores + leitura macro),
//      reusando a cascata Gemini→Groq da tabela ai_configurations.
//   6. Grava um sinal PRIVADO (user_id) com o parecer e, se houve setup,
//      a entrada (direção/entrada/stop/alvo).
//
// Estratégia da entrada (sobre candles FECHADOS):
//   EMA9 x EMA21 (gatilho) + filtro EMA50 (tendência) + ATR14 (risco):
//   SL = 1.5×ATR, alvo = 2×risco (RR ~1:2). Sem cruzamento → action 'NONE'.
//
// Deno runtime — fetch() only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const TWELVEDATA_API_KEY = Deno.env.get('TWELVEDATA_API_KEY') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? ''

// Client admin (service_role) para gravar o sinal ignorando RLS.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Ativos permitidos (allowlist). Chave = símbolo armazenado (SYMBOL_DB);
// td = formato Twelve Data; digits = casas decimais p/ formatação do parecer.
const ASSETS: Record<string, { td: string; label: string; digits: number }> = {
  XAUUSD: { td: 'XAU/USD', label: 'Ouro (XAU/USD)',     digits: 2 },
  EURUSD: { td: 'EUR/USD', label: 'Euro (EUR/USD)',     digits: 5 },
  GBPUSD: { td: 'GBP/USD', label: 'Libra (GBP/USD)',    digits: 5 },
  USDJPY: { td: 'USD/JPY', label: 'Iene (USD/JPY)',     digits: 3 },
  BTCUSD: { td: 'BTC/USD', label: 'Bitcoin (BTC/USD)',  digits: 2 },
  ETHUSD: { td: 'ETH/USD', label: 'Ethereum (ETH/USD)', digits: 2 },
}
// Escala ordenada de intervalos (do menor para o maior). Usada para a
// confluência multi-timeframe: TF escolhido + um acima + um abaixo.
const TF_SCALE = ['1min', '5min', '15min', '30min', '1h', '2h', '4h', '1day'] as const
const INTERVALS = new Set(TF_SCALE)

// Retorna [abaixo, escolhido, acima] limitando às bordas da escala.
function confluenceTFs(interval: string): string[] {
  const i = TF_SCALE.indexOf(interval as typeof TF_SCALE[number])
  if (i < 0) return [interval]
  const below = TF_SCALE[Math.max(0, i - 1)]
  const above = TF_SCALE[Math.min(TF_SCALE.length - 1, i + 1)]
  // Set remove duplicatas nas bordas (ex.: escolhido = 1min → below = 1min).
  return [...new Set([below, interval, above])]
}

// Rótulo curto do timeframe para o texto.
const TF_LABEL: Record<string, string> = {
  '1min': 'M1', '5min': 'M5', '15min': 'M15', '30min': 'M30',
  '1h': 'H1', '2h': 'H2', '4h': 'H4', '1day': 'D1',
}

const DEFAULT_SYMBOL = 'XAUUSD'
const DEFAULT_INTERVAL = '15min'
const OUTPUTSIZE = 120

// Inclui x-supabase-client-platform (enviado pelo supabase-js recente). A lista
// serve de fallback; o handler OPTIONS reflete os headers realmente pedidos.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Reflete os headers que o browser anuncia no preflight — evita quebrar sempre
// que o supabase-js adiciona um header novo (ex.: x-supabase-client-platform).
function corsFor(req: Request): Record<string, string> {
  const requested = req.headers.get('access-control-request-headers')
  return {
    ...corsHeaders,
    ...(requested ? { 'Access-Control-Allow-Headers': requested } : {}),
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// ─── Indicadores ─────────────────────────────────────────────────────────────

interface Candle { open: number; high: number; low: number; close: number }

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const out: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k))
  }
  return out
}

function atr(candles: Candle[], period: number): number {
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
  }
  if (trs.length < period) return 0
  let a = trs.slice(0, period).reduce((s, v) => s + v, 0) / period
  for (let i = period; i < trs.length; i++) a = (a * (period - 1) + trs[i]) / period
  return a
}

// RSI de Wilder — retorna o valor no último candle (0..100).
function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gain = 0, loss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d; else loss -= d
  }
  let avgGain = gain / period, avgLoss = loss / period
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// MACD (12,26,9) — retorna linha, sinal e histograma no último candle.
function macd(closes: number[]): { macd: number; signal: number; hist: number } {
  const e12 = ema(closes, 12), e26 = ema(closes, 26)
  const line = closes.map((_, i) => e12[i] - e26[i])
  const sig = ema(line, 9)
  const n = closes.length - 1
  return { macd: line[n], signal: sig[n], hist: line[n] - sig[n] }
}

// Bollinger (20, 2σ) sobre os closes — banda superior/média/inferior + %B.
function bollinger(closes: number[], period = 20, mult = 2): { upper: number; mid: number; lower: number; pctB: number } {
  const n = closes.length
  if (n < period) { const p = closes[n - 1]; return { upper: p, mid: p, lower: p, pctB: 0.5 } }
  const slice = closes.slice(n - period)
  const mid = slice.reduce((s, v) => s + v, 0) / period
  const variance = slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period
  const sd = Math.sqrt(variance)
  const upper = mid + mult * sd, lower = mid - mult * sd
  const price = closes[n - 1]
  const pctB = upper === lower ? 0.5 : (price - lower) / (upper - lower)
  return { upper, mid, lower, pctB }
}

// Suporte/resistência simples: mínima e máxima recentes (janela de N candles).
function supportResistance(candles: Candle[], lookback = 30): { support: number; resistance: number } {
  const slice = candles.slice(-lookback)
  return {
    support: Math.min(...slice.map((c) => c.low)),
    resistance: Math.max(...slice.map((c) => c.high)),
  }
}

// ─── Fontes externas ─────────────────────────────────────────────────────────

async function fetchCandles(tdSymbol: string, interval: string): Promise<Candle[]> {
  const url = new URL('https://api.twelvedata.com/time_series')
  url.searchParams.set('symbol', tdSymbol)
  url.searchParams.set('interval', interval)
  url.searchParams.set('outputsize', String(OUTPUTSIZE))
  url.searchParams.set('apikey', TWELVEDATA_API_KEY)
  url.searchParams.set('format', 'JSON')

  const res = await fetch(url.toString())
  const json = await res.json()
  if (json.status === 'error' || !Array.isArray(json.values)) {
    throw new Error(`twelvedata: ${json.message ?? 'unexpected_response'}`)
  }
  return (json.values as Array<Record<string, string>>)
    .map((v) => ({ open: +v.open, high: +v.high, low: +v.low, close: +v.close }))
    .reverse() // Twelve Data vem do mais novo → cronológico
}

// Manchetes recentes para a leitura macro. Best-effort: se falhar, seguimos
// só com o técnico (não bloqueia a análise que o usuário já pagou).
async function fetchHeadlines(tdSymbol: string): Promise<string[]> {
  if (!TWELVEDATA_API_KEY) return []
  try {
    const url = new URL('https://api.twelvedata.com/news')
    url.searchParams.set('symbol', tdSymbol)
    url.searchParams.set('apikey', TWELVEDATA_API_KEY)
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const json = await res.json()
    const items = Array.isArray(json?.data) ? json.data : Array.isArray(json?.news) ? json.news : []
    return items.slice(0, 6).map((n: Record<string, string>) => n.title).filter(Boolean)
  } catch {
    return []
  }
}

// ─── Estratégia ──────────────────────────────────────────────────────────────

interface Indicators {
  price: number; ema9: number; ema21: number; ema50: number; atr: number
  trend: 'alta' | 'baixa' | 'lateral'
  rsi: number
  macd: { macd: number; signal: number; hist: number }
  boll: { upper: number; mid: number; lower: number; pctB: number }
  sr: { support: number; resistance: number }
}

interface Setup {
  action: 'BUY' | 'SELL'
  entry: number; stop: number; target: number; confidence: number
}

function computeIndicators(candles: Candle[]): Indicators | null {
  if (candles.length < 55) return null
  const closes = candles.map((c) => c.close)
  const e9 = ema(closes, 9), e21 = ema(closes, 21), e50 = ema(closes, 50)
  const a = atr(candles, 14)
  if (a <= 0) return null
  const n = closes.length - 1
  const price = closes[n]
  const trend: Indicators['trend'] =
    price > e50[n] && e9[n] > e21[n] ? 'alta'
    : price < e50[n] && e9[n] < e21[n] ? 'baixa'
    : 'lateral'
  return {
    price, ema9: e9[n], ema21: e21[n], ema50: e50[n], atr: a, trend,
    rsi: rsi(closes, 14),
    macd: macd(closes),
    boll: bollinger(closes, 20, 2),
    sr: supportResistance(candles, 30),
  }
}

function detectSetup(candles: Candle[], ind: Indicators): Setup | null {
  const closes = candles.map((c) => c.close)
  const e9 = ema(closes, 9), e21 = ema(closes, 21)
  const n = closes.length - 1
  const crossedUp = e9[n - 1] <= e21[n - 1] && e9[n] > e21[n]
  const crossedDown = e9[n - 1] >= e21[n - 1] && e9[n] < e21[n]
  const RISK_ATR = 1.5, RR = 2
  if (crossedUp && ind.trend === 'alta') {
    return { action: 'BUY', entry: ind.price, stop: ind.price - ind.atr * RISK_ATR, target: ind.price + ind.atr * RISK_ATR * RR, confidence: 65 }
  }
  if (crossedDown && ind.trend === 'baixa') {
    return { action: 'SELL', entry: ind.price, stop: ind.price + ind.atr * RISK_ATR, target: ind.price - ind.atr * RISK_ATR * RR, confidence: 65 }
  }
  return null
}

// ─── IA (cascata Gemini → Groq, mesmo padrão de generate-articles) ───────────

async function callGemini(system: string, user: string, apiKey: string, model: string): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.5 },
        }),
        signal: controller.signal,
      },
    )
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } finally { clearTimeout(t) }
}

async function callGroq(system: string, user: string, apiKey: string, model: string): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.5,
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    if (!text) throw new Error('Empty Groq response')
    return text
  } finally { clearTimeout(t) }
}

interface AIConfig {
  gemini_api_key?: string; gemini_model?: string; gemini_model_2?: string; gemini_model_3?: string
  groq_api_key?: string; groq_model?: string
}

async function generateText(system: string, user: string, config: AIConfig): Promise<string | null> {
  const geminiKey = config.gemini_api_key || GEMINI_API_KEY
  if (geminiKey) {
    const models = [config.gemini_model || 'gemini-2.0-flash-lite', config.gemini_model_2, config.gemini_model_3].filter(Boolean) as string[]
    for (const m of models) {
      try { return await callGemini(system, user, geminiKey, m) }
      catch (e) { console.error('[signals-generate] gemini failed', m, e instanceof Error ? e.message : e) }
    }
  }
  const groqKey = config.groq_api_key || GROQ_API_KEY
  if (groqKey) {
    try { return await callGroq(system, user, groqKey, config.groq_model || 'llama-3.3-70b-versatile') }
    catch (e) { console.error('[signals-generate] groq failed', e) }
  }
  return null
}

interface TFTrend { label: string; trend: string }

function buildAnalysisPrompt(
  ind: Indicators, setup: Setup | null, headlines: string[],
  label: string, interval: string, digits: number, confluence: TFTrend[],
): string {
  const f = (v: number) => v.toFixed(digits)
  const dist50 = ((ind.price - ind.ema50) / ind.ema50 * 100).toFixed(2)
  const rsiZone = ind.rsi >= 70 ? 'sobrecomprado' : ind.rsi <= 30 ? 'sobrevendido' : 'neutro'
  const macdBias = ind.macd.hist > 0 ? 'comprador' : 'vendedor'
  const bollZone = ind.boll.pctB >= 1 ? 'acima da banda superior (esticado)'
    : ind.boll.pctB <= 0 ? 'abaixo da banda inferior (esticado)'
    : ind.boll.pctB > 0.8 ? 'perto da banda superior'
    : ind.boll.pctB < 0.2 ? 'perto da banda inferior' : 'no meio das bandas'

  const setupBlock = setup
    ? `SINAL DETECTADO: ${setup.action === 'BUY' ? 'COMPRA' : 'VENDA'} — entrada ${f(setup.entry)}, stop ${f(setup.stop)}, alvo ${f(setup.target)} (risco:retorno 1:2).`
    : `NENHUM SETUP DE ENTRADA no momento (não houve cruzamento de médias na direção da tendência). Explique por que é hora de aguardar.`
  const newsBlock = headlines.length
    ? `Manchetes recentes sobre ${label}/macro:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : `Sem manchetes disponíveis no momento — baseie a leitura macro no comportamento de preço.`

  // Confluência: tendência de cada TF (menor → maior).
  const confBlock = confluence.map((c) => `${c.label}: ${c.trend}`).join(' | ')
  const aligned = confluence.every((c) => c.trend === confluence[0].trend) && confluence[0].trend !== 'lateral'

  return `Você é um analista de trading de ${label}. Escreva um PARECER curto e objetivo em Português Brasileiro (4 a 6 parágrafos curtos) para um trader de varejo, focado no timeframe ${interval} mas usando os outros timeframes como contexto.

Dados técnicos (${label}, timeframe ${interval}):
- Preço atual: ${f(ind.price)}
- EMA9: ${f(ind.ema9)} | EMA21: ${f(ind.ema21)} | EMA50: ${f(ind.ema50)}
- Distância do preço à EMA50: ${dist50}%
- ATR(14): ${f(ind.atr)} (volatilidade média por candle)
- Tendência no ${interval}: ${ind.trend}
- RSI(14): ${ind.rsi.toFixed(1)} (${rsiZone})
- MACD: histograma ${ind.macd.hist >= 0 ? '+' : ''}${ind.macd.hist.toFixed(4)} (viés ${macdBias})
- Bollinger(20,2): preço ${bollZone} | superior ${f(ind.boll.upper)}, média ${f(ind.boll.mid)}, inferior ${f(ind.boll.lower)}
- Suporte recente: ${f(ind.sr.support)} | Resistência recente: ${f(ind.sr.resistance)}

Confluência multi-timeframe (tendência por TF): ${confBlock}
${aligned ? `Os timeframes estão ALINHADOS em ${confluence[0].trend} — confluência forte.` : `Os timeframes NÃO estão totalmente alinhados — há divergência entre eles.`}

${setupBlock}

${newsBlock}

Instruções:
- Comece pela confluência multi-timeframe: diga se os TFs concordam e o que isso significa para a força do movimento.
- Faça a leitura do ${interval}: tendência, RSI (sobrecompra/sobrevenda), MACD (momentum) e posição nas Bandas de Bollinger.
- Cite suporte e resistência como referências concretas de alvo/invalidação.
- Comente a volatilidade (ATR) e o risco.
- Leitura macro breve interpretando as manchetes (se houver).
- Termine com orientação prática (operar o sinal / aguardar / cautela).
- NÃO prometa resultado. Deixe claro que é análise, não recomendação de investimento.
- Texto corrido, sem markdown, sem títulos, sem bullet points.`
}

function fallbackAnalysis(
  ind: Indicators, setup: Setup | null, label: string, interval: string, digits: number, confluence: TFTrend[],
): string {
  const f = (v: number) => v.toFixed(digits)
  const rsiZone = ind.rsi >= 70 ? 'sobrecomprado' : ind.rsi <= 30 ? 'sobrevendido' : 'neutro'
  const conf = confluence.map((c) => `${c.label} ${c.trend}`).join(', ')
  const base = `${label}: tendência no ${interval} em ${ind.trend} (confluência — ${conf}). Preço em ${f(ind.price)}, RSI ${ind.rsi.toFixed(0)} (${rsiZone}), ATR ${f(ind.atr)}. Suporte ${f(ind.sr.support)} e resistência ${f(ind.sr.resistance)} como referências.`
  const call = setup
    ? ` Há um setup de ${setup.action === 'BUY' ? 'compra' : 'venda'} no ${interval}: entrada ${f(setup.entry)}, stop ${f(setup.stop)} e alvo ${f(setup.target)} (risco:retorno 1:2).`
    : ` Não há setup de entrada agora no ${interval} — as médias não cruzaram na direção da tendência. Momento de aguardar confirmação.`
  return base + call + ' Esta é uma análise técnica automatizada, não uma recomendação de investimento.'
}

const round5 = (v: number) => Math.round(v * 1e5) / 1e5

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  // Auth: precisamos do JWT do usuário para cobrar e vincular o sinal a ele.
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'missing_bearer_token' })
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return jsonResponse(401, { error: 'invalid_token' })
  const userId = userData.user.id

  if (!TWELVEDATA_API_KEY) return jsonResponse(500, { error: 'missing_twelvedata_key' })

  // ── Ativo e timeframe escolhidos (validados contra allowlist) ──────────────
  let body: { symbol?: string; interval?: string } = {}
  try { body = await req.json() } catch { /* corpo vazio = defaults */ }

  const symbolDb = (body.symbol && ASSETS[body.symbol]) ? body.symbol : DEFAULT_SYMBOL
  const interval = (body.interval && INTERVALS.has(body.interval)) ? body.interval : DEFAULT_INTERVAL
  const asset = ASSETS[symbolDb]

  // Cobra a análise ANTES de rodar (cobra sempre, com ou sem entrada). O débito
  // é transacional na RPC, no contexto do usuário (RLS-safe).
  const { data: newBalance, error: chargeErr } = await userClient.rpc('charge_signal_analysis')
  if (chargeErr) {
    const msg = chargeErr.message || ''
    if (msg.includes('insufficient_coins')) return jsonResponse(402, { error: 'insufficient_coins' })
    console.error('[signals-generate] charge', chargeErr)
    return jsonResponse(500, { error: 'charge_failed' })
  }

  // A partir daqui o usuário JÁ pagou — entregamos a análise mesmo se uma fonte
  // secundária falhar. Se os candles do TF principal falharem, estornamos.
  //
  // Confluência: busca o TF escolhido + um acima + um abaixo (até 3 req). O TF
  // escolhido é o principal (setup/indicadores); os outros só p/ a tendência.
  const tfs = confluenceTFs(interval)
  let candlesByTf: Record<string, Candle[]>
  try {
    const results = await Promise.all(tfs.map((tf) => fetchCandles(asset.td, tf)))
    candlesByTf = Object.fromEntries(tfs.map((tf, i) => [tf, results[i]]))
  } catch (e) {
    console.error('[signals-generate] fetchCandles', e)
    await supabaseAdmin.rpc('refund_signal_analysis', { p_user_id: userId }).catch(() => {})
    return jsonResponse(502, { error: 'quotes_fetch_failed' })
  }

  const candles = candlesByTf[interval]
  const ind = computeIndicators(candles)
  if (!ind) {
    await supabaseAdmin.rpc('refund_signal_analysis', { p_user_id: userId }).catch(() => {})
    return jsonResponse(502, { error: 'insufficient_data' })
  }

  // Tendência de cada TF (menor → maior) para a confluência.
  const confluence: TFTrend[] = tfs.map((tf) => {
    const i = computeIndicators(candlesByTf[tf])
    return { label: TF_LABEL[tf] ?? tf, trend: i ? i.trend : 'lateral' }
  })

  const setup = detectSetup(candles, ind)
  const headlines = await fetchHeadlines(asset.td)

  // Parecer por IA (best-effort com fallback técnico local).
  const { data: aiConfig } = await supabaseAdmin.from('ai_configurations').select('*').maybeSingle()
  const system = `Você é um analista técnico de ${asset.label} objetivo e conservador. Nunca promete lucro.`
  const aiText = await generateText(system, buildAnalysisPrompt(ind, setup, headlines, asset.label, interval, asset.digits, confluence), aiConfig || {})
  const analysis = (aiText?.trim()) || fallbackAnalysis(ind, setup, asset.label, interval, asset.digits, confluence)

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('signals')
    .insert({
      source: 'auto',
      user_id: userId,
      symbol: symbolDb,
      action: setup ? setup.action : 'NONE',
      entry_price: setup ? round5(setup.entry) : null,
      stop_loss: setup ? round5(setup.stop) : null,
      take_profit: setup ? round5(setup.target) : null,
      status: 'open',
      timeframe: interval,
      analysis,
      confidence: setup ? setup.confidence : null,
    })
    .select('*')
    .single()

  if (insertErr) {
    console.error('[signals-generate] insert', insertErr)
    await supabaseAdmin.rpc('refund_signal_analysis', { p_user_id: userId }).catch(() => {})
    return jsonResponse(500, { error: 'insert_failed' })
  }

  return jsonResponse(200, {
    ok: true,
    new_balance: newBalance,
    has_entry: !!setup,
    signal: inserted,
  })
})
