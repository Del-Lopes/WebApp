// Supabase Edge Function — signals-generate
// Puxa candles OHLC do XAU/USD (Twelve Data), roda a estratégia própria e,
// quando dispara, grava um sinal em public.signals (source='auto').
//
// Estratégia (momentum com filtro de tendência) sobre candles FECHADOS:
//   - EMA9 cruza EMA21 → gatilho de direção
//   - EMA50 como filtro de tendência (só compra acima, só vende abaixo)
//   - ATR(14) dimensiona o risco: SL = 1.5×ATR, TP = 2×SL (RR ~1:2)
//
// Idempotência: um índice único garante no máximo 1 sinal 'auto' aberto por
// símbolo. Se já existe um aberto, não gera outro. Ao inverter a direção,
// o aberto anterior é cancelado antes de abrir o novo.
//
// Proteção: exige header `x-cron-secret` == env CRON_SECRET. Pensada para ser
// chamada por um cron (pg_cron / scheduler), não pelo browser.
//
// Deno runtime — fetch() only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TWELVEDATA_API_KEY = Deno.env.get('TWELVEDATA_API_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SYMBOL = 'XAU/USD'      // formato Twelve Data
const SYMBOL_DB = 'XAUUSD'    // formato armazenado
const INTERVAL = '15min'
const OUTPUTSIZE = 120        // candles suficientes para EMA50 + ATR14 estabilizarem

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

interface Candle { open: number; high: number; low: number; close: number }

// EMA de uma série (ordem cronológica: mais antigo → mais novo).
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const out: number[] = []
  let prev = values[0]
  out.push(prev)
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out.push(prev)
  }
  return out
}

// ATR (Wilder) — precisa de highs/lows/closes cronológicos.
function atr(candles: Candle[], period: number): number {
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high
    const l = candles[i].low
    const pc = candles[i - 1].close
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
  }
  if (trs.length < period) return 0
  // Média simples inicial + suavização de Wilder
  let a = trs.slice(0, period).reduce((s, v) => s + v, 0) / period
  for (let i = period; i < trs.length; i++) {
    a = (a * (period - 1) + trs[i]) / period
  }
  return a
}

async function fetchCandles(): Promise<Candle[]> {
  const url = new URL('https://api.twelvedata.com/time_series')
  url.searchParams.set('symbol', SYMBOL)
  url.searchParams.set('interval', INTERVAL)
  url.searchParams.set('outputsize', String(OUTPUTSIZE))
  url.searchParams.set('apikey', TWELVEDATA_API_KEY)
  url.searchParams.set('format', 'JSON')

  const res = await fetch(url.toString())
  const json = await res.json()
  if (json.status === 'error' || !Array.isArray(json.values)) {
    throw new Error(`twelvedata: ${json.message ?? 'unexpected_response'}`)
  }
  // Twelve Data devolve do mais novo para o mais antigo → invertemos para cronológico.
  return (json.values as Array<Record<string, string>>)
    .map((v) => ({
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }))
    .reverse()
}

interface Decision {
  action: 'BUY' | 'SELL'
  entry: number
  stop: number
  target: number
  confidence: number
  rationale: string
}

// Decide sobre candles fechados. Usa o penúltimo/último para detectar o cruzamento.
function decide(candles: Candle[]): Decision | null {
  if (candles.length < 55) return null
  const closes = candles.map((c) => c.close)

  const ema9 = ema(closes, 9)
  const ema21 = ema(closes, 21)
  const ema50 = ema(closes, 50)
  const a = atr(candles, 14)
  if (a <= 0) return null

  const n = closes.length - 1
  const price = closes[n]

  // Cruzamento no candle mais recente fechado.
  const crossedUp = ema9[n - 1] <= ema21[n - 1] && ema9[n] > ema21[n]
  const crossedDown = ema9[n - 1] >= ema21[n - 1] && ema9[n] < ema21[n]

  const trendUp = price > ema50[n]
  const trendDown = price < ema50[n]

  const RISK_ATR = 1.5
  const RR = 2

  if (crossedUp && trendUp) {
    const stop = price - a * RISK_ATR
    const target = price + a * RISK_ATR * RR
    return {
      action: 'BUY',
      entry: price,
      stop,
      target,
      confidence: 65,
      rationale: 'EMA9 cruzou acima da EMA21 com preço acima da EMA50 (tendência de alta). SL 1.5×ATR, alvo RR 1:2.',
    }
  }
  if (crossedDown && trendDown) {
    const stop = price + a * RISK_ATR
    const target = price - a * RISK_ATR * RR
    return {
      action: 'SELL',
      entry: price,
      stop,
      target,
      confidence: 65,
      rationale: 'EMA9 cruzou abaixo da EMA21 com preço abaixo da EMA50 (tendência de baixa). SL 1.5×ATR, alvo RR 1:2.',
    }
  }
  return null
}

const round5 = (v: number) => Math.round(v * 1e5) / 1e5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' })
  }

  // Proteção: só quem tem o segredo do cron dispara a geração.
  const secret = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return jsonResponse(401, { error: 'unauthorized' })
  }
  if (!TWELVEDATA_API_KEY) {
    return jsonResponse(500, { error: 'missing_twelvedata_key' })
  }

  let candles: Candle[]
  try {
    candles = await fetchCandles()
  } catch (e) {
    console.error('[signals-generate] fetchCandles', e)
    return jsonResponse(502, { error: 'quotes_fetch_failed', detail: String(e) })
  }

  const decision = decide(candles)
  if (!decision) {
    return jsonResponse(200, { ok: true, generated: false, reason: 'no_setup' })
  }

  // Já existe um sinal auto aberto para este símbolo?
  const { data: openSignal, error: openErr } = await supabaseAdmin
    .from('signals')
    .select('id, action')
    .eq('source', 'auto')
    .eq('symbol', SYMBOL_DB)
    .eq('status', 'open')
    .maybeSingle()

  if (openErr) {
    console.error('[signals-generate] open lookup', openErr)
    return jsonResponse(500, { error: 'internal_error' })
  }

  if (openSignal) {
    // Mesma direção → nada a fazer (o índice único também impediria duplicar).
    if (openSignal.action === decision.action) {
      return jsonResponse(200, { ok: true, generated: false, reason: 'already_open_same_direction' })
    }
    // Direção invertida → cancela o antigo antes de abrir o novo.
    const { error: cancelErr } = await supabaseAdmin
      .from('signals')
      .update({ status: 'cancelled' })
      .eq('id', openSignal.id)
    if (cancelErr) {
      console.error('[signals-generate] cancel previous', cancelErr)
      return jsonResponse(500, { error: 'internal_error' })
    }
  }

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('signals')
    .insert({
      source: 'auto',
      symbol: SYMBOL_DB,
      action: decision.action,
      entry_price: round5(decision.entry),
      stop_loss: round5(decision.stop),
      take_profit: round5(decision.target),
      status: 'open',
      timeframe: INTERVAL,
      rationale: decision.rationale,
      confidence: decision.confidence,
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[signals-generate] insert', insertErr)
    return jsonResponse(500, { error: 'insert_failed', detail: insertErr.message })
  }

  return jsonResponse(200, {
    ok: true,
    generated: true,
    signal_id: inserted.id,
    action: decision.action,
    entry: round5(decision.entry),
    stop_loss: round5(decision.stop),
    take_profit: round5(decision.target),
  })
})
