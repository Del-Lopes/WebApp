// Supabase Edge Function — crypto-snapshot
//
// Guarda o retrato do dia do mercado cripto: as moedas em trending e a foto das
// categorias/narrativas. É o que permite responder "o que apareceu no radar nos
// últimos 7/30 dias" — algo que a API do CoinGecko não responde, porque só expõe
// a janela de 24h.
//
//   POST|GET /functions/v1/crypto-snapshot
//     → { ok: true, wrote: boolean, date: 'YYYY-MM-DD', trending: n, categories: n }
//
// IDEMPOTENTE POR DIA (UTC): se o dia já foi capturado, retorna sem escrever e
// sem consultar o CoinGecko. Por isso pode ser chamada tanto por um agendador
// quanto pelo próprio app ao abrir a sessão Crypto — o que garante que o
// histórico comece a acumular mesmo antes de o cron estar configurado.
//
// Requer "Verify JWT" DESLIGADO: o agendador chama sem JWT de usuário.
// A função não expõe dado privado e não aceita entrada do chamador — só grava
// cotação pública. Chamadas repetidas no mesmo dia são no-op.
//
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CG_KEY = Deno.env.get('COINGECKO_KEY') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

const CG_BASE = 'https://api.coingecko.com/api/v3'

async function cgGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(CG_BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  if (CG_KEY) url.searchParams.set('x_cg_demo_api_key', CG_KEY)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`coingecko_http_${res.status}`)
  return res.json()
}

// Data de referência em UTC — a mesma usada no default da coluna snapshot_date,
// para que a checagem de idempotência e a gravação nunca discordem.
function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('access-control-request-headers')
    return new Response('ok', {
      headers: { ...corsHeaders, ...(reqHeaders ? { 'Access-Control-Allow-Headers': reqHeaders } : {}) },
    })
  }

  const today = utcToday()

  // Já capturamos hoje? Sai antes de gastar chamada no CoinGecko.
  const { count, error: countErr } = await supabaseAdmin
    .from('crypto_trending_snapshot')
    .select('id', { count: 'exact', head: true })
    .eq('snapshot_date', today)

  if (countErr) {
    console.error('[crypto-snapshot] count error', countErr)
    return jsonResponse(500, { error: 'internal_error' })
  }

  if ((count ?? 0) > 0) {
    return jsonResponse(200, { ok: true, wrote: false, date: today })
  }

  let trendingRows: Record<string, unknown>[] = []
  let categoryRows: Record<string, unknown>[] = []

  try {
    const trending = await cgGet('/search/trending')
    const coins = Array.isArray(trending?.coins) ? trending.coins : []
    trendingRows = coins.map((c: any, i: number) => ({
      snapshot_date: today,
      coin_id: c.item?.id ?? '',
      name: c.item?.name ?? '',
      symbol: (c.item?.symbol ?? '').toUpperCase(),
      thumb: c.item?.thumb ?? c.item?.small ?? null,
      market_cap_rank: c.item?.market_cap_rank ?? null,
      position: i + 1,
    })).filter((r: any) => r.coin_id && r.name)
  } catch (e) {
    console.error('[crypto-snapshot] trending fetch failed', e)
    return jsonResponse(502, { error: 'trending_fetch_failed' })
  }

  try {
    const cats = await cgGet('/coins/categories', { order: 'market_cap_desc' })
    const arr = Array.isArray(cats) ? cats : []
    categoryRows = arr
      .filter((c: any) => c?.id && typeof c.market_cap === 'number' && c.market_cap > 0)
      .slice(0, 120)
      .map((c: any) => ({
        snapshot_date: today,
        category_id: c.id,
        name: c.name ?? c.id,
        market_cap: c.market_cap ?? null,
        change_24h: typeof c.market_cap_change_24h === 'number' ? c.market_cap_change_24h : null,
        volume_24h: c.volume_24h ?? null,
      }))
  } catch (e) {
    // Categorias são complementares: se falharem, ainda vale gravar o trending.
    console.error('[crypto-snapshot] categories fetch failed', e)
  }

  if (trendingRows.length === 0) {
    return jsonResponse(502, { error: 'empty_trending' })
  }

  // onConflict nos índices únicos (snapshot_date, id) — duas execuções
  // simultâneas no mesmo dia não geram duplicata nem erro.
  const { error: trendErr } = await supabaseAdmin
    .from('crypto_trending_snapshot')
    .upsert(trendingRows, { onConflict: 'snapshot_date,coin_id' })

  if (trendErr) {
    console.error('[crypto-snapshot] trending insert error', trendErr)
    return jsonResponse(500, { error: 'trending_insert_failed' })
  }

  if (categoryRows.length > 0) {
    const { error: catErr } = await supabaseAdmin
      .from('crypto_category_snapshot')
      .upsert(categoryRows, { onConflict: 'snapshot_date,category_id' })
    if (catErr) console.error('[crypto-snapshot] categories insert error', catErr)
  }

  return jsonResponse(200, {
    ok: true,
    wrote: true,
    date: today,
    trending: trendingRows.length,
    categories: categoryRows.length,
  })
})
