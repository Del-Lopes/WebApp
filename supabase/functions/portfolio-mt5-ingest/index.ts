// Supabase Edge Function — portfolio-mt5-ingest
// Endpoint isolado pro EA do Live Portfólio (cliente-facing).
// Autentica via Bearer token (SHA-256 hash batido contra portfolio_mt5_link)
// e faz upsert em portfolio_mt5_status.
//
// Deno runtime — fetch() only, no Node SDKs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-ea-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface IngestPayload {
  ea_version?: string
  account_login: number
  account_currency?: string
  account_company?: string
  account_server?: string
  balance: number
  equity: number
  floating_pnl: number
  daily_pnl: number
  open_positions: number
  last_trade_at?: string | null
  terminal_hash?: string
  timestamp: string
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

function isValidPayload(p: unknown): p is IngestPayload {
  if (!p || typeof p !== 'object') return false
  const obj = p as Record<string, unknown>
  return (
    typeof obj.account_login === 'number' &&
    Number.isFinite(obj.account_login) &&
    typeof obj.balance === 'number' &&
    typeof obj.equity === 'number' &&
    typeof obj.floating_pnl === 'number' &&
    typeof obj.daily_pnl === 'number' &&
    typeof obj.open_positions === 'number' &&
    typeof obj.timestamp === 'string'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // GET /portfolio-mt5-ingest/link-id — EA busca o account_id uma vez para cache PostgREST
  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop()
  if (req.method === 'GET' && action === 'link-id') {
    const token = extractBearer(req)
    if (!token) return jsonResponse(401, { error: 'missing_bearer_token' })
    const tokenHash = await sha256Hex(token)
    const { data: link } = await supabaseAdmin
      .from('portfolio_mt5_link')
      .select('account_id, api_key_revoked_at')
      .eq('api_key_hash', tokenHash)
      .maybeSingle()
    if (!link) return jsonResponse(401, { error: 'invalid_token' })
    if (link.api_key_revoked_at) return jsonResponse(403, { error: 'token_revoked' })
    return jsonResponse(200, { account_id: link.account_id })
  }

  if (req.method !== 'POST')    return jsonResponse(405, { error: 'method_not_allowed' })

  const token = extractBearer(req)
  if (!token) return jsonResponse(401, { error: 'missing_bearer_token' })

  const tokenHash = await sha256Hex(token)

  const { data: link, error: linkErr } = await supabaseAdmin
    .from('portfolio_mt5_link')
    .select('account_id, user_id, account_login, api_key_revoked_at')
    .eq('api_key_hash', tokenHash)
    .maybeSingle()

  if (linkErr) {
    console.error('[portfolio-mt5-ingest] link lookup error', linkErr)
    return jsonResponse(500, { error: 'internal_error' })
  }
  if (!link) return jsonResponse(401, { error: 'invalid_token' })
  if (link.api_key_revoked_at) return jsonResponse(403, { error: 'token_revoked' })

  let body: unknown
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'invalid_json' }) }
  if (!isValidPayload(body)) return jsonResponse(400, { error: 'invalid_payload' })
  const p = body

  if (Number(p.account_login) !== Number(link.account_login)) {
    console.warn('[portfolio-mt5-ingest] account mismatch', {
      expected: link.account_login,
      received: p.account_login,
    })
    return jsonResponse(403, { error: 'account_mismatch' })
  }

  const reportedAt = p.timestamp
  const lastTradeAt = p.last_trade_at && p.last_trade_at.length > 0 ? p.last_trade_at : null

  const { error: upsertErr } = await supabaseAdmin
    .from('portfolio_mt5_status')
    .upsert(
      {
        account_id: link.account_id,
        user_id: link.user_id,
        account_login: p.account_login,
        account_currency: p.account_currency ?? null,
        account_company: p.account_company ?? null,
        account_server: p.account_server ?? null,
        balance: p.balance,
        equity: p.equity,
        floating_pnl: p.floating_pnl,
        daily_pnl: p.daily_pnl,
        open_positions: p.open_positions,
        last_trade_at: lastTradeAt,
        ea_version: p.ea_version ?? null,
        terminal_hash: p.terminal_hash ?? null,
        reported_at: reportedAt,
        received_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' },
    )

  if (upsertErr) {
    console.error('[portfolio-mt5-ingest] status upsert error', upsertErr)
    return jsonResponse(500, { error: 'status_upsert_failed' })
  }

  // Reseta force_sync após receber telemetria
  await supabaseAdmin
    .from('portfolio_mt5_status')
    .update({ force_sync: false })
    .eq('account_id', link.account_id)

  return jsonResponse(200, { ok: true })
})
