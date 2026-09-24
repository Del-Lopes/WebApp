// Supabase Edge Function — mt5-link
// Operações de gestão do vínculo estratégia ↔ MT5, chamadas pelo modal "Conectar":
//   POST /functions/v1/mt5-link/connect    { strategy_id, account_login, broker_display? }
//     → cria o link e devolve { api_key } (texto plano, uma vez só)
//   POST /functions/v1/mt5-link/rotate     { strategy_id }
//     → revoga a chave atual e devolve uma nova { api_key }
//   POST /functions/v1/mt5-link/disconnect { strategy_id }
//     → apaga o link (cascata apaga status e history)
//
// Autentica via JWT do usuário (header Authorization), não pelo token do EA.
// Usa service_role pra escrever (ignora RLS) mas valida ownership da estratégia.
//
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-client-platform',
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

// Gera chave no formato txp_live_<32 hex chars> (~128 bits de entropia)
function generateApiKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `txp_live_${hex}`
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

// Valida que a estratégia existe, é do tipo 'ea' e — opcionalmente — que
// pertence ao usuário. Hoje products não tem user_id; o admin pode conectar
// qualquer estratégia, e o link guarda quem conectou.
async function loadStrategy(strategyId: string) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, type, title')
    .eq('id', strategyId)
    .eq('type', 'ea')
    .maybeSingle()
  if (error) return null
  return data
}

interface ConnectBody {
  strategy_id: string
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

  if (!body.strategy_id || typeof body.account_login !== 'number') {
    return jsonResponse(400, { error: 'invalid_payload' })
  }

  const strategy = await loadStrategy(body.strategy_id)
  if (!strategy) return jsonResponse(404, { error: 'strategy_not_found' })

  // Já existe link? Pra criar do zero, o cliente precisa chamar /disconnect antes.
  const { data: existing } = await supabaseAdmin
    .from('strategy_mt5_link')
    .select('strategy_id')
    .eq('strategy_id', body.strategy_id)
    .maybeSingle()
  if (existing) return jsonResponse(409, { error: 'already_connected' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 12) // "txp_live_a3f"

  const { error: insErr } = await supabaseAdmin.from('strategy_mt5_link').insert({
    strategy_id: body.strategy_id,
    user_id: userId,
    account_login: body.account_login,
    broker_display: body.broker_display ?? null,
    api_key_hash: apiKeyHash,
    api_key_prefix: apiKeyPrefix,
  })

  if (insErr) {
    console.error('[mt5-link] insert error', insErr)
    return jsonResponse(500, { error: 'insert_failed' })
  }

  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

interface StrategyOnlyBody {
  strategy_id: string
}

async function handleRotate(req: Request, userId: string): Promise<Response> {
  let body: StrategyOnlyBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }
  if (!body.strategy_id) return jsonResponse(400, { error: 'invalid_payload' })

  const { data: link } = await supabaseAdmin
    .from('strategy_mt5_link')
    .select('user_id')
    .eq('strategy_id', body.strategy_id)
    .maybeSingle()
  if (!link) return jsonResponse(404, { error: 'link_not_found' })
  if (link.user_id !== userId) return jsonResponse(403, { error: 'not_owner' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 12)

  const { error: updErr } = await supabaseAdmin
    .from('strategy_mt5_link')
    .update({
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      api_key_created_at: new Date().toISOString(),
      api_key_revoked_at: null,
    })
    .eq('strategy_id', body.strategy_id)

  if (updErr) {
    console.error('[mt5-link] rotate error', updErr)
    return jsonResponse(500, { error: 'rotate_failed' })
  }

  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

async function handleDisconnect(req: Request, userId: string): Promise<Response> {
  let body: StrategyOnlyBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }
  if (!body.strategy_id) return jsonResponse(400, { error: 'invalid_payload' })

  const { data: link } = await supabaseAdmin
    .from('strategy_mt5_link')
    .select('user_id')
    .eq('strategy_id', body.strategy_id)
    .maybeSingle()
  if (!link) return jsonResponse(404, { error: 'link_not_found' })
  if (link.user_id !== userId) return jsonResponse(403, { error: 'not_owner' })

  const { error: delErr } = await supabaseAdmin
    .from('strategy_mt5_link')
    .delete()
    .eq('strategy_id', body.strategy_id)
  if (delErr) {
    console.error('[mt5-link] delete error', delErr)
    return jsonResponse(500, { error: 'delete_failed' })
  }

  return jsonResponse(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('access-control-request-headers')
    return new Response('ok', {
      headers: { ...corsHeaders, ...(reqHeaders ? { 'Access-Control-Allow-Headers': reqHeaders } : {}) },
    })
  }
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return jsonResponse(401, { error: 'unauthorized' })

  // As estratégias são da vitrine (vistas por todos): vincular uma conta MT5 a
  // elas é ação de staff. Sem isso, qualquer cliente conectava uma estratégia
  // ainda sem vínculo e publicava equity/P&L inventados para todos.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['admin', 'first_mate'].includes(profile.role)) {
    return jsonResponse(403, { error: 'forbidden' })
  }

  // Roteamento pelo último segmento da URL.
  // Em produção a function é montada em /functions/v1/mt5-link/<action>.
  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop()

  switch (action) {
    case 'connect':    return handleConnect(req, user.id)
    case 'rotate':     return handleRotate(req, user.id)
    case 'disconnect': return handleDisconnect(req, user.id)
    default:           return jsonResponse(404, { error: 'unknown_action' })
  }
})
