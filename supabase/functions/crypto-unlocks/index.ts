// Supabase Edge Function — crypto-unlocks
//
// Monta o calendário de desbloqueio de tokens a partir do bucket público de
// datasets do DefiLlama (gratuito; a API /emissions do mesmo serviço é paga).
//
//   POST|GET /functions/v1/crypto-unlocks
//     → { ok, processed, updated, remaining, skipped? }
//
// POR QUE EM LOTES: são ~370 protocolos e cada arquivo tem ~1 MB. Baixar tudo
// numa execução estouraria o tempo da função. Como cronograma de vesting é
// determinístico e muda raramente, processamos um lote por execução, sempre
// pegando os menos atualizados — a lista inteira se renova sozinha em alguns
// dias e depois se mantém fresca.
//
// Requer "Verify JWT" DESLIGADO (chamada por agendador, sem JWT de usuário).
// Não aceita entrada do chamador e só grava dado público de mercado.
//
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

const DATASETS = 'https://defillama-datasets.llama.fi'

// Protocolos por execução. Cada arquivo tem ~1 MB: 20 mantém a execução curta
// o bastante para o limite de tempo da função com folga.
const BATCH_SIZE = 20

// Só reprocessa um protocolo se a leitura tiver mais que isso. Evita que
// chamadas seguidas fiquem girando sobre os mesmos registros.
const STALE_HOURS = 72

interface UnlockEvent {
  timestamp: number
  noOfTokens?: number[]
  category?: string
  unlockType?: string
}

interface UnlockRow {
  protocol_slug: string
  name: string
  gecko_id: string | null
  next_unlock_at: string | null
  next_unlock_tokens: number | null
  next_unlock_category: string | null
  next_unlock_type: string | null
  max_supply: number | null
  adjusted_supply: number | null
  refreshed_at: string
}

// Extrai o próximo evento futuro de um arquivo de protocolo.
// metadata.events já vem discretizado (data, quantidade, categoria, tipo), então
// não é preciso derivar nada da série diária.
function parseProtocol(slug: string, json: any): UnlockRow | null {
  const meta = json?.metadata
  if (!meta) return null

  const nowSec = Math.floor(Date.now() / 1000)
  const events: UnlockEvent[] = Array.isArray(meta.events) ? meta.events : []

  const future = events
    .filter((e) => typeof e?.timestamp === 'number' && e.timestamp > nowSec)
    .sort((a, b) => a.timestamp - b.timestamp)

  const next = future[0] ?? null
  const tokens = next && Array.isArray(next.noOfTokens)
    ? next.noOfTokens.reduce((acc, n) => acc + (Number(n) || 0), 0)
    : null

  // metadata.token vem como "coingecko:aptos" — guardamos só o id.
  const token: string = typeof meta.token === 'string' ? meta.token : ''
  const geckoId = token.startsWith('coingecko:') ? token.slice('coingecko:'.length) : null

  const supply = json?.supplyMetrics ?? {}

  return {
    protocol_slug: slug,
    name: json?.name ?? slug,
    gecko_id: geckoId,
    next_unlock_at: next ? new Date(next.timestamp * 1000).toISOString() : null,
    next_unlock_tokens: tokens,
    next_unlock_category: next?.category ?? null,
    next_unlock_type: next?.unlockType ?? null,
    max_supply: typeof supply.maxSupply === 'number' ? supply.maxSupply : null,
    adjusted_supply: typeof supply.adjustedSupply === 'number' ? supply.adjustedSupply : null,
    refreshed_at: new Date().toISOString(),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('access-control-request-headers')
    return new Response('ok', {
      headers: { ...corsHeaders, ...(reqHeaders ? { 'Access-Control-Allow-Headers': reqHeaders } : {}) },
    })
  }

  // 1. Lista de protocolos com dados de unlock (arquivo pequeno, ~4 KB).
  let slugs: string[]
  try {
    const res = await fetch(`${DATASETS}/emissionsProtocolsList`)
    if (!res.ok) throw new Error(`list_http_${res.status}`)
    const json = await res.json()
    slugs = Array.isArray(json) ? json.filter((s: unknown) => typeof s === 'string') : []
  } catch (e) {
    console.error('[crypto-unlocks] list fetch failed', e)
    return jsonResponse(502, { error: 'list_fetch_failed' })
  }

  if (slugs.length === 0) return jsonResponse(502, { error: 'empty_list' })

  // 2. O que já temos e quando foi lido pela última vez.
  const { data: known, error: knownErr } = await supabaseAdmin
    .from('crypto_unlock')
    .select('protocol_slug, refreshed_at')

  if (knownErr) {
    console.error('[crypto-unlocks] read state failed', knownErr)
    return jsonResponse(500, { error: 'internal_error' })
  }

  const seenAt = new Map<string, number>()
  ;(known ?? []).forEach((r: any) => seenAt.set(r.protocol_slug, Date.parse(r.refreshed_at)))

  const staleBefore = Date.now() - STALE_HOURS * 3600 * 1000

  // Nunca vistos primeiro (bootstrap), depois os mais antigos.
  const pending = slugs
    .filter((s) => !seenAt.has(s) || (seenAt.get(s) ?? 0) < staleBefore)
    .sort((a, b) => (seenAt.get(a) ?? 0) - (seenAt.get(b) ?? 0))

  if (pending.length === 0) {
    return jsonResponse(200, { ok: true, processed: 0, updated: 0, remaining: 0, skipped: 'all_fresh' })
  }

  const batch = pending.slice(0, BATCH_SIZE)
  const rows: UnlockRow[] = []
  let processed = 0

  // 3. Sequencial de propósito: em paralelo seriam ~20 MB simultâneos, e o
  //    ganho de tempo não compensa o risco de estourar memória da função.
  for (const slug of batch) {
    processed++
    try {
      const res = await fetch(`${DATASETS}/emissions/${encodeURIComponent(slug)}`)
      if (!res.ok) continue
      const json = await res.json()
      const row = parseProtocol(slug, json)
      if (row) rows.push(row)
    } catch (e) {
      // Um protocolo problemático não pode derrubar o lote inteiro. Ele volta
      // para a fila na próxima execução, por continuar sem refreshed_at.
      console.error(`[crypto-unlocks] ${slug} failed`, e)
    }
  }

  if (rows.length > 0) {
    const { error: upErr } = await supabaseAdmin
      .from('crypto_unlock')
      .upsert(rows, { onConflict: 'protocol_slug' })
    if (upErr) {
      console.error('[crypto-unlocks] upsert failed', upErr)
      return jsonResponse(500, { error: 'upsert_failed' })
    }
  }

  return jsonResponse(200, {
    ok: true,
    processed,
    updated: rows.length,
    remaining: Math.max(pending.length - batch.length, 0),
  })
})
