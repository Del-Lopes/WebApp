// Supabase Edge Function — forum-image-upload
// Recebe a imagem de um post do Fórum e grava no bucket R2 (Cloudflare).
//   POST /functions/v1/forum-image-upload   corpo = bytes da imagem
//     Authorization: Bearer <JWT do usuário>
//     → 200 { key: "<user_id>/<uuid>.<webp|jpg|png>" }
//
// Exige login (verify_jwt padrão + getUser aqui). O tipo vem dos primeiros bytes
// do arquivo, nunca do Content-Type do cliente. Limites: 2 MB por imagem,
// 30 por usuário por dia e 300 no total por hora. As chaves do R2 ficam só nos
// secrets desta function (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET); o navegador nunca as vê.
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

const MAX_BYTES = 2 * 1024 * 1024
const MIN_BYTES = 100
const PER_USER_PER_DAY = 30
const GLOBAL_PER_HOUR = 300

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

// PNG, JPEG e WebP. GIF fica de fora (animado não é necessário e pesa).
function detectImage(b: Uint8Array): { mime: string; ext: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
      && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { mime: 'image/png', ext: 'png' }
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
      && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: 'image/webp', ext: 'webp' }
  return null
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    console.error('[forum-image-upload] secrets do R2 ausentes')
    return json(500, { error: 'not_configured' })
  }

  // Quem chama: o gateway já validou o JWT; aqui obtemos o usuário.
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) return json(401, { error: 'not_authenticated' })
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json(401, { error: 'not_authenticated' })
  const userId = userData.user.id

  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES) return json(413, { error: 'image_too_large' })
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length > MAX_BYTES) return json(413, { error: 'image_too_large' })
  if (bytes.length < MIN_BYTES) return json(400, { error: 'invalid_image' })

  const type = detectImage(bytes)
  if (!type) return json(415, { error: 'unsupported_type' })

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [{ count: userCount, error: e1 }, { count: globalCount, error: e2 }] = await Promise.all([
    supabaseAdmin.from('forum_images').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', dayAgo),
    supabaseAdmin.from('forum_images').select('id', { count: 'exact', head: true })
      .gte('created_at', hourAgo),
  ])
  if (e1 || e2) {
    console.error('[forum-image-upload] count', e1 ?? e2)
    return json(500, { error: 'server_error' })
  }
  if ((userCount ?? 0) >= PER_USER_PER_DAY || (globalCount ?? 0) >= GLOBAL_PER_HOUR) {
    return json(429, { error: 'rate_limited' })
  }

  const key = `${userId}/${crypto.randomUUID()}.${type.ext}`
  const r2 = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  })
  const put = await r2.fetch(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`, {
    method: 'PUT',
    body: bytes,
    headers: {
      'Content-Type': type.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  if (!put.ok) {
    console.error('[forum-image-upload] R2', put.status, await put.text().catch(() => ''))
    return json(502, { error: 'storage_error' })
  }

  // O arquivo já está no R2: se o registro falhar, a imagem vale mesmo assim.
  const { error: insertError } = await supabaseAdmin
    .from('forum_images')
    .insert({ user_id: userId, object_key: key, bytes: bytes.length })
  if (insertError) console.error('[forum-image-upload] insert', insertError)

  return json(200, { key })
})
