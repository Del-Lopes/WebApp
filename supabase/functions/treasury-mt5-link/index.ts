// Supabase Edge Function — treasury-mt5-link
// Gerencia o vínculo entre uma conta da Tesouraria (treasury_accounts) e uma conta MT5.
//   POST /functions/v1/treasury-mt5-link/connect    { account_id, account_login, broker_display? }
//   POST /functions/v1/treasury-mt5-link/rotate     { account_id }
//   POST /functions/v1/treasury-mt5-link/disconnect { account_id }
//
// Apenas admin/first_mate podem operar — a tesouraria é interna.
//
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Mesmo formato do strategy_mt5_link, mas com prefixo distinto pra deixar
// óbvio na hora de auditar logs.
function generateApiKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `txp_treas_${hex}`
}

async function getAuthedUser(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

async function isStaff(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return !!data && (data.role === 'admin' || data.role === 'first_mate')
}

async function loadAccount(accountId: string) {
  const { data, error } = await supabaseAdmin
    .from('treasury_accounts')
    .select('id, name')
    .eq('id', accountId)
    .maybeSingle()
  if (error) return null
  return data
}

interface ConnectBody {
  account_id: string
  account_login: number
  broker_display?: string
}

async function handleConnect(req: Request, userId: string): Promise<Response> {
  let body: ConnectBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  if (!body.account_id || typeof body.account_login !== 'number') {
    return jsonResponse(400, { error: 'invalid_payload' })
  }

  const account = await loadAccount(body.account_id)
  if (!account) return jsonResponse(404, { error: 'account_not_found' })

  const { data: existing } = await supabaseAdmin
    .from('treasury_mt5_link')
    .select('account_id')
    .eq('account_id', body.account_id)
    .maybeSingle()
  if (existing) return jsonResponse(409, { error: 'already_connected' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 13) // "txp_treas_a3f"

  const { error: insErr } = await supabaseAdmin.from('treasury_mt5_link').insert({
    account_id: body.account_id,
    user_id: userId,
    account_login: body.account_login,
    broker_display: body.broker_display ?? null,
    api_key_hash: apiKeyHash,
    api_key_prefix: apiKeyPrefix,
  })

  if (insErr) {
    console.error('[treasury-mt5-link] insert error', insErr)
    return jsonResponse(500, { error: 'insert_failed' })
  }

  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

interface AccountOnlyBody {
  account_id: string
}

async function handleRotate(req: Request, _userId: string): Promise<Response> {
  let body: AccountOnlyBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }
  if (!body.account_id) return jsonResponse(400, { error: 'invalid_payload' })

  const { data: link } = await supabaseAdmin
    .from('treasury_mt5_link')
    .select('account_id')
    .eq('account_id', body.account_id)
    .maybeSingle()
  if (!link) return jsonResponse(404, { error: 'link_not_found' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 13)

  const { error: updErr } = await supabaseAdmin
    .from('treasury_mt5_link')
    .update({
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      api_key_created_at: new Date().toISOString(),
      api_key_revoked_at: null,
    })
    .eq('account_id', body.account_id)

  if (updErr) {
    console.error('[treasury-mt5-link] rotate error', updErr)
    return jsonResponse(500, { error: 'rotate_failed' })
  }

  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

async function handleDisconnect(req: Request, _userId: string): Promise<Response> {
  let body: AccountOnlyBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }
  if (!body.account_id) return jsonResponse(400, { error: 'invalid_payload' })

  const { error: delErr } = await supabaseAdmin
    .from('treasury_mt5_link')
    .delete()
    .eq('account_id', body.account_id)
  if (delErr) {
    console.error('[treasury-mt5-link] delete error', delErr)
    return jsonResponse(500, { error: 'delete_failed' })
  }

  return jsonResponse(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return jsonResponse(401, { error: 'unauthorized' })
  if (!(await isStaff(user.id))) return jsonResponse(403, { error: 'forbidden' })

  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop()

  switch (action) {
    case 'connect':    return handleConnect(req, user.id)
    case 'rotate':     return handleRotate(req, user.id)
    case 'disconnect': return handleDisconnect(req, user.id)
    default:           return jsonResponse(404, { error: 'unknown_action' })
  }
})
