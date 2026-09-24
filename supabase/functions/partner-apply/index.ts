// Supabase Edge Function — partner-apply
// Recebe o formulário "Seja um Parceiro" da landing e grava em
// partner_applications (lido pelo staff em Painel Admin › Parceiros).
//   POST /functions/v1/partner-apply  { name, email, phone, message?, website? }
//     → 200 { ok: true }
//
// Pública (verify_jwt = false): o visitante da landing não tem conta.
// Proteções: validação de campos, honeypot (`website` preenchido = bot, finge
// sucesso sem gravar), limite por IP e teto global por hora.
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const PER_IP_PER_HOUR = 3
const GLOBAL_PER_HOUR = 60

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?traderafk\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : 'https://traderafk.com'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : ''
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  // Honeypot: campo invisível para humanos.
  if (clean(body.website, 200)) return json(200, { ok: true })

  const name = clean(body.name, 120)
  const email = clean(body.email, 200).toLowerCase()
  const phone = clean(body.phone, 30)
  const message = clean(body.message, 2000) || null

  if (name.length < 2) return json(400, { error: 'invalid_name' })
  if (!EMAIL_RE.test(email)) return json(400, { error: 'invalid_email' })
  if (phone.replace(/\D/g, '').length < 10) return json(400, { error: 'invalid_phone' })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const ipHash = await sha256Hex(`${ip}:${SUPABASE_SERVICE_ROLE_KEY.slice(-16)}`)
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const [{ count: ipCount, error: e1 }, { count: allCount, error: e2 }] = await Promise.all([
    supabaseAdmin.from('partner_applications').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('created_at', since),
    supabaseAdmin.from('partner_applications').select('id', { count: 'exact', head: true })
      .gte('created_at', since),
  ])
  if (e1 || e2) {
    console.error('[partner-apply] count', e1 ?? e2)
    return json(500, { error: 'server_error' })
  }
  if ((ipCount ?? 0) >= PER_IP_PER_HOUR || (allCount ?? 0) >= GLOBAL_PER_HOUR) {
    return json(429, { error: 'rate_limited' })
  }

  const { error } = await supabaseAdmin
    .from('partner_applications')
    .insert({ name, email, phone, message, ip_hash: ipHash })
  if (error) {
    console.error('[partner-apply] insert', error)
    return json(500, { error: 'server_error' })
  }

  return json(200, { ok: true })
})
