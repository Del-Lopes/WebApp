// Supabase Edge Function — delete-account
// Exclui uma conta (usuário do Auth + perfil + dados ligados a ele).
//
//   POST /functions/v1/delete-account            {}                      → o próprio usuário exclui a sua conta
//   POST /functions/v1/delete-account  { "user_id": "<uuid>" }           → admin exclui a conta de outro usuário
//     Authorization: Bearer <JWT do usuário>
//     → 200 { ok: true }
//
// Regras (o papel vem do banco, não do token):
//   • qualquer usuário pode excluir a própria conta, EXCETO admin (para o sistema nunca ficar sem admin);
//   • só admin exclui a conta de outra pessoa, e nunca a de outro admin.
//
// Antes de apagar o usuário limpamos o que não tem exclusão em cascata (licenças e pedidos de parceria)
// e, se os secrets do R2 estiverem configurados, as imagens do Fórum enviadas por ele (LGPD).
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID') ?? ''
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID') ?? ''
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? ''
const R2_BUCKET = Deno.env.get('R2_BUCKET') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_ORIGINS = [
  /^https:\/\/([a-z0-9-]+\.)?(traderafk\.com|tradexperience\.com\.br)$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : 'https://traderafk.com'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

// Apaga do R2 as imagens do Fórum do usuário (melhor esforço: falha aqui não impede a exclusão da conta).
async function deleteForumImages(userId: string) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return
  const { data: rows, error } = await supabaseAdmin.from('forum_images').select('object_key').eq('user_id', userId).limit(1000)
  if (error || !rows?.length) return
  const r2 = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' })
  for (const row of rows) {
    try {
      await r2.fetch(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${row.object_key}`, { method: 'DELETE' })
    } catch (e) {
      console.warn('[delete-account] R2', row.object_key, e)
    }
  }
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
  const callerId = userData.user.id

  let requested: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    requested = typeof body?.user_id === 'string' && body.user_id ? body.user_id : null
  } catch {
    requested = null
  }
  if (requested && !UUID_RE.test(requested)) return json(400, { error: 'invalid_user_id' })

  const targetId = requested ?? callerId
  const self = targetId === callerId

  const { data: caller } = await supabaseAdmin.from('profiles').select('role').eq('id', callerId).maybeSingle()
  const callerRole = caller?.role ?? 'client'

  if (self) {
    // Admin não se exclui por aqui: o sistema não pode ficar sem administrador.
    if (callerRole === 'admin') return json(403, { error: 'admin_self_delete' })
  } else {
    if (callerRole !== 'admin') return json(403, { error: 'forbidden' })
    const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', targetId).maybeSingle()
    if (target?.role === 'admin') return json(403, { error: 'target_is_admin' })
  }

  console.log(`[delete-account] ${self ? 'auto-exclusão' : `admin ${callerId} excluindo`} ${targetId}`)

  await deleteForumImages(targetId)

  // Tabelas que apontam para o usuário sem ON DELETE CASCADE: precisam ser limpas antes.
  for (const table of ['license_requests', 'partner_requests']) {
    const { error } = await supabaseAdmin.from(table).delete().eq('user_id', targetId)
    if (error && error.code !== '42P01') console.warn(`[delete-account] ${table}`, error.message)
  }
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', targetId)
  if (profileError) console.warn('[delete-account] profiles', profileError.message)

  const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(targetId)
  if (delError) {
    console.error('[delete-account] deleteUser', delError)
    return json(500, { error: 'delete_failed', detail: delError.message })
  }

  return json(200, { ok: true })
})
