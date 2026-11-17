// Supabase Edge Function — ext-journal
// Recebe os trades FECHADOS que a extensão Trader Pro captura e os grava no Diário (trade_journal) do dono da licença.
//   POST /functions/v1/ext-journal/ingest   { device_token, trades: [...] }   (até 50 por chamada)
//     → { inserted, skipped, invalid }
//
// Segurança:
//   - Autentica pelo token do DISPOSITIVO (hash em ext_devices): dispositivo revogado ou licença inativa = recusa na hora.
//   - Exige o recurso 'journalSync' na licença.
//   - Idempotente: (user_id, source, external_id) é único; trade já existente é IGNORADO (não sobrescreve a reflexão que
//     o usuário escreveu no WebApp).
//   - Valida cada campo; o user_id vem SEMPRE do dispositivo, nunca do corpo.
// Verify JWT DESLIGADO (config.toml). Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const MAX_BATCH = 50
const SOURCE = 'trader_pro'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const iso = (ms: unknown): string | null => {
  const n = num(ms)
  if (n === null || n < 946684800000 || n > Date.now() + 86_400_000) return null // entre 2000 e amanhã
  return new Date(n).toISOString()
}

interface Row {
  user_id: string; source: string; external_id: string; asset: string; side: 'buy' | 'sell'; volume: number
  entry_price: number | null; exit_price: number | null; opened_at: string; closed_at: string
  result_amount: number | null; fees: number | null; is_estimated: boolean; platform: string
}

function toRow(userId: string, t: Record<string, unknown>): Row | null {
  const externalId = typeof t.id === 'string' && t.id.length > 0 && t.id.length <= 120 ? t.id : null
  const asset = typeof t.symbol === 'string' && t.symbol.length > 0 && t.symbol.length <= 30 ? t.symbol : null
  const side = t.side === 'long' ? 'buy' : t.side === 'short' ? 'sell' : null
  const size = num(t.size)
  const opened = iso(t.openedAt)
  const closed = iso(t.closedAt)
  if (!externalId || !asset || !side || !size || size <= 0 || size >= 1e9 || !opened || !closed || closed < opened) return null
  const money = (v: unknown) => { const n = num(v); return n === null ? null : Math.round(n * 100) / 100 }
  return {
    user_id: userId, source: SOURCE, external_id: externalId, asset, side, volume: Math.round(size * 1e4) / 1e4,
    entry_price: num(t.entry), exit_price: num(t.exit), opened_at: opened, closed_at: closed,
    result_amount: money(t.pnl), fees: money(t.fees), is_estimated: t.estimated === true,
    platform: typeof t.platform === 'string' ? t.platform.slice(0, 40) : 'vest',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  if (new URL(req.url).pathname.split('/').filter(Boolean).pop() !== 'ingest') return json(404, { error: 'not_found' })

  let body: { device_token?: unknown; trades?: unknown }
  try { body = await req.json() } catch { return json(400, { error: 'invalid_json' }) }
  const token = typeof body.device_token === 'string' ? body.device_token : ''
  if (!token.startsWith('txp_ext_') || token.length > 80) return json(401, { error: 'invalid_device' })
  if (!Array.isArray(body.trades) || body.trades.length === 0 || body.trades.length > MAX_BATCH) return json(400, { error: 'invalid_payload' })

  const { data: dev } = await admin.from('ext_devices').select('id, license_id, user_id, revoked_at').eq('token_hash', await sha256Hex(token)).maybeSingle()
  if (!dev) return json(401, { error: 'invalid_device' })
  if (dev.revoked_at) return json(401, { error: 'device_revoked' })

  const { data: lic } = await admin.from('ext_licenses').select('status, starts_at, expires_at, features').eq('id', dev.license_id).maybeSingle()
  const now = Date.now()
  const active = lic && lic.status === 'active' && new Date(lic.starts_at).getTime() <= now && (!lic.expires_at || new Date(lic.expires_at).getTime() > now)
  if (!active) return json(403, { error: 'license_inactive' })
  if (!(lic.features ?? []).includes('journalSync')) return json(403, { error: 'feature_not_included' })

  const rows: Row[] = []
  let invalid = 0
  for (const t of body.trades) {
    const r = t && typeof t === 'object' ? toRow(dev.user_id, t as Record<string, unknown>) : null
    if (r) rows.push(r); else invalid++
  }
  if (!rows.length) return json(200, { inserted: 0, skipped: 0, invalid })

  // ignoreDuplicates: trade já existente NÃO é sobrescrito (preserva o que o usuário escreveu no diário)
  const { data: ins, error } = await admin.from('trade_journal')
    .upsert(rows, { onConflict: 'user_id,source,external_id', ignoreDuplicates: true }).select('id')
  if (error) { console.error('[ext-journal] upsert', error); return json(500, { error: 'internal' }) }
  const inserted = ins?.length ?? 0
  await admin.from('ext_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', dev.id)
  return json(200, { inserted, skipped: rows.length - inserted, invalid })
})
