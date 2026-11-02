// Supabase Edge Function — forum-image-delete
// Apaga uma imagem do Fórum no bucket R2 (Cloudflare) e tira o registro de
// forum_images. Só staff (admin / first_mate), pelo Painel Admin › Storage.
//   POST /functions/v1/forum-image-delete   { "key": "<user_id>/<uuid>.<webp|jpg|png>" }
//     Authorization: Bearer <JWT do usuário>
//     → 200 { ok: true }
//
// A chave precisa ter o formato gerado pelo upload e existir em forum_images:
// não dá para apagar outro arquivo do bucket. Se o R2 falhar, o registro fica
// (para tentar de novo). Os secrets do R2 são os mesmos de forum-image-upload.
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

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const KEY_RE = new RegExp(`^${UUID}/${UUID}\\.(?:webp|jpg|png)$`)

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

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    console.error('[forum-image-delete] secrets do R2 ausentes')
    return json(500, { error: 'not_configured' })
  }

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) return json(401, { error: 'not_authenticated' })
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json(401, { error: 'not_authenticated' })

  // Só equipe: o papel vem do banco, não do token.
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (!profile || !['admin', 'first_mate'].includes(profile.role)) return json(403, { error: 'forbidden' })

  let key = ''
  try {
    const body = await req.json()
    key = typeof body?.key === 'string' ? body.key : ''
  } catch {
    return json(400, { error: 'invalid_json' })
  }
  if (!KEY_RE.test(key)) return json(400, { error: 'invalid_key' })

  const { data: row, error: rowError } = await supabaseAdmin
    .from('forum_images').select('id').eq('object_key', key).maybeSingle()
  if (rowError) {
    console.error('[forum-image-delete] lookup', rowError)
    return json(500, { error: 'server_error' })
  }
  if (!row) return json(404, { error: 'not_found' })

  const r2 = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  })
  const del = await r2.fetch(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`, { method: 'DELETE' })
  // 404 = já não estava no bucket (apagada à mão): segue e limpa o registro.
  if (!del.ok && del.status !== 404) {
    console.error('[forum-image-delete] R2', del.status, await del.text().catch(() => ''))
    return json(502, { error: 'storage_error' })
  }

  const { error: deleteError } = await supabaseAdmin.from('forum_images').delete().eq('id', row.id)
  if (deleteError) {
    console.error('[forum-image-delete] delete row', deleteError)
    return json(500, { error: 'server_error' })
  }

  return json(200, { ok: true })
})
