// Supabase Edge Function — handbot-link
// Gerencia o vínculo do usuário com o EA Hand Bot no MT5.
//   POST /functions/v1/handbot-link/connect    { account_login, broker_display? }
//     → cria link e devolve { api_key } (texto plano, exibido apenas uma vez)
//   POST /functions/v1/handbot-link/rotate     {}
//     → revoga chave atual e devolve nova { api_key }
//   POST /functions/v1/handbot-link/disconnect {}
//     → remove link (cascata apaga parâmetros)
//
// Autenticação: JWT do usuário (header Authorization).
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

function generateApiKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `txp_hbot_${hex}`
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

interface ConnectBody {
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

  if (typeof body.account_login !== 'number' || !Number.isFinite(body.account_login)) {
    return jsonResponse(400, { error: 'invalid_payload' })
  }

  // Um usuário só pode ter um link Hand Bot ativo
  const { data: existing } = await supabaseAdmin
    .from('handbot_link')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return jsonResponse(409, { error: 'already_connected' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 13) // "txp_hbot_a3f9"

  const { data: link, error: insErr } = await supabaseAdmin
    .from('handbot_link')
    .insert({
      user_id: userId,
      account_login: body.account_login,
      broker_display: body.broker_display ?? null,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
    })
    .select('id')
    .single()

  if (insErr || !link) {
    console.error('[handbot-link] insert error', insErr)
    return jsonResponse(500, { error: 'insert_failed' })
  }

  // Cria linha de parâmetros com valores default
  const { error: paramsErr } = await supabaseAdmin
    .from('handbot_params')
    .insert({
      user_id: userId,
      handbot_link_id: link.id,
    })

  if (paramsErr) {
    console.error('[handbot-link] params insert error', paramsErr)
    // Reverte o link para manter consistência
    await supabaseAdmin.from('handbot_link').delete().eq('id', link.id)
    return jsonResponse(500, { error: 'params_init_failed' })
  }

  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

async function handleRotate(req: Request, userId: string): Promise<Response> {
  const { data: link } = await supabaseAdmin
    .from('handbot_link')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!link) return jsonResponse(404, { error: 'link_not_found' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 13)

  const { error: updErr } = await supabaseAdmin
    .from('handbot_link')
    .update({
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      api_key_created_at: new Date().toISOString(),
      api_key_revoked_at: null,
    })
    .eq('user_id', userId)

  if (updErr) {
    console.error('[handbot-link] rotate error', updErr)
    return jsonResponse(500, { error: 'rotate_failed' })
  }

  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

async function handleDisconnect(_req: Request, userId: string): Promise<Response> {
  const { data: link } = await supabaseAdmin
    .from('handbot_link')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!link) return jsonResponse(404, { error: 'link_not_found' })

  const { error: delErr } = await supabaseAdmin
    .from('handbot_link')
    .delete()
    .eq('user_id', userId)

  if (delErr) {
    console.error('[handbot-link] delete error', delErr)
    return jsonResponse(500, { error: 'delete_failed' })
  }

  return jsonResponse(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return jsonResponse(401, { error: 'unauthorized' })

  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop()

  switch (action) {
    case 'connect':    return handleConnect(req, user.id)
    case 'rotate':     return handleRotate(req, user.id)
    case 'disconnect': return handleDisconnect(req, user.id)
    default:           return jsonResponse(404, { error: 'unknown_action' })
  }
})
