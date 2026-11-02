// Supabase Edge Function — market-candles
// Candles OHLC de ativos que a Twelve Data (plano gratuito) não cobre:
// Nasdaq 100 e Dow Jones (futuros NQ/YM), Ibovespa (base do Mini Índice) e
// USD/BRL (base do Mini Dólar). Fonte: Yahoo Finance (gráfico público).
//   POST /functions/v1/market-candles  { symbol: 'NAS100', interval: '15min', limit?: 60 }
//   → { candles: [{ time, open, high, low, close }] }  (cronológico, tempo em ms)
//
// Exige login (Verify JWT ligado + getUser aqui). Símbolo e intervalo passam
// por allowlist. 2h e 4h não existem no Yahoo: são agregados a partir de 1h.
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const SYMBOLS: Record<string, string> = {
  NAS100: 'NQ=F',
  US30: 'YM=F',
  WIN: '^BVSP',
  WDO: 'BRL=X',
}

// intervalo → [interval Yahoo, range, agregação em horas (0 = nenhuma)]
const INTERVALS: Record<string, [string, string, number]> = {
  '1min': ['1m', '5d', 0],
  '5min': ['5m', '1mo', 0],
  '15min': ['15m', '1mo', 0],
  '30min': ['30m', '1mo', 0],
  '1h': ['60m', '3mo', 0],
  '2h': ['60m', '6mo', 2],
  '4h': ['60m', '1y', 4],
  '1day': ['1d', '2y', 0],
}

const ALLOWED_ORIGINS = [
  /^https:\/\/([a-z0-9-]+\.)?(traderafk\.com|tradexperience\.com\.br)$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : 'https://traderafk.com'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

interface Candle { time: number; open: number; high: number; low: number; close: number }

async function fetchYahoo(ySymbol: string, interval: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?interval=${interval}&range=${range}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TraderAFK/1.0)' } })
  if (!res.ok) throw new Error(`yahoo_http_${res.status}`)
  const json = await res.json()
  const r = json?.chart?.result?.[0]
  const q = r?.indicators?.quote?.[0]
  const ts: number[] | undefined = r?.timestamp
  if (!r || !q || !Array.isArray(ts)) throw new Error('yahoo_unexpected_response')
  const out: Candle[] = []
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i]
    if ([o, h, l, c].some((v) => typeof v !== 'number' || !Number.isFinite(v))) continue
    out.push({ time: ts[i] * 1000, open: o, high: h, low: l, close: c })
  }
  return out
}

// Agrupa velas de 1h em blocos de N horas (alinhados ao relógio UTC).
function aggregate(candles: Candle[], hours: number): Candle[] {
  const size = hours * 3600_000
  const out: Candle[] = []
  for (const c of candles) {
    const bucket = Math.floor(c.time / size) * size
    const last = out[out.length - 1]
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, c.high)
      last.low = Math.min(last.low, c.low)
      last.close = c.close
    } else {
      out.push({ time: bucket, open: c.open, high: c.high, low: c.low, close: c.close })
    }
  }
  return out
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) return json(401, { error: 'not_authenticated' })
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json(401, { error: 'not_authenticated' })

  let body: { symbol?: string; interval?: string; limit?: number } = {}
  try { body = await req.json() } catch { /* corpo vazio */ }
  const ySymbol = body.symbol ? SYMBOLS[body.symbol] : undefined
  const cfg = body.interval ? INTERVALS[body.interval] : undefined
  if (!ySymbol || !cfg) return json(400, { error: 'invalid_request' })
  const limit = Math.min(Math.max(Math.floor(Number(body.limit) || 60), 20), 200)

  try {
    let candles = await fetchYahoo(ySymbol, cfg[0], cfg[1])
    if (cfg[2] > 0) candles = aggregate(candles, cfg[2])
    if (candles.length === 0) return json(502, { error: 'no_data' })
    return json(200, { candles: candles.slice(-limit) })
  } catch (e) {
    console.error('[market-candles]', e instanceof Error ? e.message : e)
    return json(502, { error: 'quotes_fetch_failed' })
  }
})
