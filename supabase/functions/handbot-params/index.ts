// Supabase Edge Function — handbot-params
// Gerencia os parâmetros configuráveis do EA Hand Bot.
//
//   GET  /functions/v1/handbot-params
//     Auth: Bearer <ea-api-key>  (token do EA, igual ao mt5-ingest)
//     → devolve os parâmetros atuais para o EA aplicar
//
//   POST /functions/v1/handbot-params
//     Auth: JWT do usuário (header Authorization)
//     Body: { ...campos de handbot_params }
//     → salva os parâmetros (upsert)
//
//   GET  /functions/v1/handbot-params/link
//     Auth: JWT do usuário
//     → devolve o link atual (sem revelar a chave completa)
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// GET para o EA: autentica via Bearer token do EA, devolve parâmetros
async function handleEaGet(req: Request): Promise<Response> {
  const token = extractBearer(req)
  if (!token) return jsonResponse(401, { error: 'missing_bearer_token' })

  const tokenHash = await sha256Hex(token)

  const { data: link, error: linkErr } = await supabaseAdmin
    .from('handbot_link')
    .select('id, user_id, account_login, api_key_revoked_at')
    .eq('api_key_hash', tokenHash)
    .maybeSingle()

  if (linkErr) {
    console.error('[handbot-params] link lookup error', linkErr)
    return jsonResponse(500, { error: 'internal_error' })
  }
  if (!link) return jsonResponse(401, { error: 'invalid_token' })
  if (link.api_key_revoked_at) return jsonResponse(403, { error: 'token_revoked' })

  const { data: params, error: paramsErr } = await supabaseAdmin
    .from('handbot_params')
    .select('*')
    .eq('handbot_link_id', link.id)
    .maybeSingle()

  if (paramsErr) {
    console.error('[handbot-params] params fetch error', paramsErr)
    return jsonResponse(500, { error: 'params_fetch_failed' })
  }

  if (!params) return jsonResponse(404, { error: 'params_not_found' })

  return jsonResponse(200, {
    trailing_avg_enabled:    params.trailing_avg_enabled,
    trailing_avg_distance:   params.trailing_avg_distance,
    trailing_avg_stop:       params.trailing_avg_stop,
    trailing_pts_enabled:    params.trailing_pts_enabled,
    trailing_pts_distance:   params.trailing_pts_distance,
    trailing_pts_stop:       params.trailing_pts_stop,
    break_even_avg_enabled:  params.break_even_avg_enabled,
    break_even_avg_distance: params.break_even_avg_distance,
    break_even_avg_gain:     params.break_even_avg_gain,
    break_even_pts_enabled:  params.break_even_pts_enabled,
    break_even_pts_distance: params.break_even_pts_distance,
    break_even_pts_gain:     params.break_even_pts_gain,
    add_points_enabled:      params.add_points_enabled,
    add_points_lot:          params.add_points_lot,
    add_points_distance:     params.add_points_distance,
    add_points_avg_distance: params.add_points_avg_distance,
    updated_at:              params.updated_at,
  })
}

// POST pelo usuário: salva/atualiza parâmetros
async function handleUserPost(req: Request, userId: string): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  // Verifica que o usuário tem um link ativo
  const { data: link } = await supabaseAdmin
    .from('handbot_link')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!link) return jsonResponse(404, { error: 'link_not_found' })

  const allowedFields = [
    'trailing_avg_enabled', 'trailing_avg_distance', 'trailing_avg_stop',
    'trailing_pts_enabled', 'trailing_pts_distance', 'trailing_pts_stop',
    'break_even_avg_enabled', 'break_even_avg_distance', 'break_even_avg_gain',
    'break_even_pts_enabled', 'break_even_pts_distance', 'break_even_pts_gain',
    'add_points_enabled', 'add_points_lot', 'add_points_distance', 'add_points_avg_distance',
  ]

  const updates: Record<string, unknown> = { user_id: userId, handbot_link_id: link.id }
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('handbot_params')
    .upsert(updates, { onConflict: 'user_id' })

  if (upsertErr) {
    console.error('[handbot-params] upsert error', upsertErr)
    return jsonResponse(500, { error: 'save_failed' })
  }

  return jsonResponse(200, { ok: true })
}

// GET pelo usuário: retorna link atual (para exibir status na UI)
async function handleUserLinkGet(userId: string): Promise<Response> {
  const { data: link, error } = await supabaseAdmin
    .from('handbot_link')
    .select('id, account_login, broker_display, api_key_prefix, api_key_created_at, api_key_revoked_at, created_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[handbot-params] link get error', error)
    return jsonResponse(500, { error: 'internal_error' })
  }

  return jsonResponse(200, { link: link ?? null })
}

// GET pelo usuário: retorna parâmetros atuais para exibir no formulário
async function handleUserParamsGet(userId: string): Promise<Response> {
  const { data: link } = await supabaseAdmin
    .from('handbot_link')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!link) return jsonResponse(200, { params: null })

  const { data: params, error } = await supabaseAdmin
    .from('handbot_params')
    .select('*')
    .eq('handbot_link_id', link.id)
    .maybeSingle()

  if (error) {
    console.error('[handbot-params] user params get error', error)
    return jsonResponse(500, { error: 'internal_error' })
  }

  return jsonResponse(200, { params: params ?? null })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop()

  // GET sem JWT = EA fazendo poll de parâmetros
  if (req.method === 'GET' && action !== 'link' && action !== 'user-params') {
    return handleEaGet(req)
  }

  // Todas as demais rotas exigem JWT do usuário
  const user = await getAuthedUser(req)
  if (!user) return jsonResponse(401, { error: 'unauthorized' })

  if (req.method === 'GET' && action === 'link') {
    return handleUserLinkGet(user.id)
  }

  if (req.method === 'GET' && action === 'user-params') {
    return handleUserParamsGet(user.id)
  }

  if (req.method === 'POST') {
    return handleUserPost(req, user.id)
  }

  return jsonResponse(405, { error: 'method_not_allowed' })
})
