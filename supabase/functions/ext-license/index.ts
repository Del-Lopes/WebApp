// Supabase Edge Function — ext-license
// Licenciamento da extensão Trader Pro. Verify JWT DESLIGADO (config.toml): as rotas da extensão usam o token do
// dispositivo; as rotas do WebApp validam o JWT do usuário aqui dentro.
//
//   Rotas do WEBAPP (header Authorization: Bearer <jwt do usuário>):
//     POST /ext-license/pair       {}                → { code, expires_in }       gera código de pareamento (10 min, uso único)
//     POST /ext-license/devices    {}                → { license, devices[] }     lista dispositivos da licença
//     POST /ext-license/revoke     { device_id }     → { ok }                     revoga um dispositivo
//   Rotas da EXTENSÃO (sem login; autenticam por código/token de dispositivo):
//     POST /ext-license/activate   { code, label?, version? } → { device_token, license_token, license }
//     POST /ext-license/refresh    { device_token, version? } → { license_token, license }
//     POST /ext-license/deactivate { device_token }          → { ok }
//
// license_token = JWT ES256 (ECDSA P-256) assinado com EXT_LICENSE_PRIVATE_JWK; a extensão o verifica OFFLINE com a chave
// pública embutida. Vale TOKEN_TTL_H horas (7 dias): é o máximo que um aparelho offline segue válido; online a extensão renova a cada 24 h, então uma revogação chega em ~1 dia.
//
// Secrets: EXT_LICENSE_PRIVATE_JWK (JSON da chave privada), EXT_LICENSE_IP_SALT (qualquer texto longo, p/ hash de IP).
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const PRIVATE_JWK = Deno.env.get('EXT_LICENSE_PRIVATE_JWK') ?? ''
const IP_SALT = Deno.env.get('EXT_LICENSE_IP_SALT') ?? 'trader-pro'

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const TOKEN_TTL_H = 7 * 24 // 7 dias: tempo máximo que a extensão fica válida sem falar com o servidor (renova sozinha a cada 24 h)
const CODE_TTL_S = 600
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I: ditado e digitado sem erro
const MAX_FAILED_ACTIVATIONS = 10 // por IP, em 10 min
const KNOWN_FEATURES = new Set(['execution', 'orderFlow', 'autoBe', 'autoStop', 'macros', 'journalSync'])

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

const b64url = (data: Uint8Array | string): string => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let signKey: CryptoKey | null = null
async function getSignKey(): Promise<CryptoKey> {
  if (signKey) return signKey
  if (!PRIVATE_JWK) throw new Error('EXT_LICENSE_PRIVATE_JWK não configurada')
  signKey = await crypto.subtle.importKey('jwk', JSON.parse(PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  return signKey
}

interface LicenseRow {
  id: string; user_id: string; plan: string; status: string; features: string[] | null
  max_devices: number; starts_at: string; expires_at: string | null
}

/** Estado efetivo da licença agora. null = válida. */
function licenseProblem(l: LicenseRow | null): string | null {
  if (!l) return 'no_license'
  if (l.status !== 'active') return l.status === 'suspended' ? 'suspended' : 'revoked'
  const now = Date.now()
  if (new Date(l.starts_at).getTime() > now) return 'not_started'
  if (l.expires_at && new Date(l.expires_at).getTime() <= now) return 'expired'
  return null
}

async function signLicenseToken(l: LicenseRow, deviceId: string): Promise<{ token: string; exp: number }> {
  const iat = Math.floor(Date.now() / 1000)
  let exp = iat + TOKEN_TTL_H * 3600
  if (l.expires_at) exp = Math.min(exp, Math.floor(new Date(l.expires_at).getTime() / 1000))
  const features = (l.features ?? []).filter((f) => KNOWN_FEATURES.has(f))
  const payload = { iss: 'traderafk', aud: 'trader-pro-ext', sub: l.user_id, lic: l.id, dev: deviceId, plan: l.plan, features, iat, exp }
  const head = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await getSignKey(), new TextEncoder().encode(`${head}.${body}`)))
  return { token: `${head}.${body}.${b64url(sig)}`, exp }
}

const licenseView = (l: LicenseRow, exp: number) => ({
  plan: l.plan, features: (l.features ?? []).filter((f) => KNOWN_FEATURES.has(f)), max_devices: l.max_devices,
  license_expires_at: l.expires_at, token_expires_at: new Date(exp * 1000).toISOString(),
})

async function ipHash(req: Request): Promise<string | null> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return ip ? (await sha256Hex(`${IP_SALT}:${ip}`)).slice(0, 32) : null
}

async function logEvent(e: { user_id?: string | null; license_id?: string | null; device_id?: string | null; kind: string; detail?: string; ip_hash?: string | null }) {
  await admin.from('ext_license_events').insert({
    user_id: e.user_id ?? null, license_id: e.license_id ?? null, device_id: e.device_id ?? null,
    kind: e.kind, detail: e.detail?.slice(0, 200) ?? null, ip_hash: e.ip_hash ?? null,
  })
}

async function getAuthedUser(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

async function loadLicense(userId: string): Promise<LicenseRow | null> {
  const { data } = await admin.from('ext_licenses').select('*').eq('user_id', userId).eq('product', 'trader_pro').maybeSingle()
  return (data as LicenseRow | null) ?? null
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try { const b = await req.json(); return b && typeof b === 'object' ? b as Record<string, unknown> : {} } catch { return null }
}

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null)

function makeCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const raw = Array.from(bytes).map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}
const normalizeCode = (c: string): string => c.toUpperCase().replace(/[^A-Z0-9]/g, '')

function makeDeviceToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `txp_ext_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

// ─── Rotas do WebApp ─────────────────────────────────────────────────────────

async function handlePair(req: Request): Promise<Response> {
  const user = await getAuthedUser(req)
  if (!user) return json(401, { error: 'unauthorized' })
  const lic = await loadLicense(user.id)
  const problem = licenseProblem(lic)
  if (problem) return json(403, { error: 'license_inactive', reason: problem })

  // um código vivo por vez: gerar outro invalida os anteriores
  await admin.from('ext_pairing_codes').update({ used_at: new Date().toISOString() }).eq('user_id', user.id).is('used_at', null)
  const code = makeCode()
  const { error } = await admin.from('ext_pairing_codes').insert({
    user_id: user.id, code_hash: await sha256Hex(normalizeCode(code)), expires_at: new Date(Date.now() + CODE_TTL_S * 1000).toISOString(),
  })
  if (error) { console.error('[ext-license] pair', error); return json(500, { error: 'internal' }) }
  await logEvent({ user_id: user.id, license_id: lic!.id, kind: 'pair', ip_hash: await ipHash(req) })
  return json(200, { code, expires_in: CODE_TTL_S })
}

async function handleDevices(req: Request): Promise<Response> {
  const user = await getAuthedUser(req)
  if (!user) return json(401, { error: 'unauthorized' })
  const lic = await loadLicense(user.id)
  if (!lic) return json(200, { license: null, devices: [] })
  const { data: devices } = await admin.from('ext_devices')
    .select('id, label, ext_version, created_at, last_seen_at, revoked_at').eq('license_id', lic.id).order('created_at', { ascending: false })
  return json(200, {
    license: { plan: lic.plan, status: lic.status, problem: licenseProblem(lic), expires_at: lic.expires_at, max_devices: lic.max_devices, features: lic.features },
    devices: devices ?? [],
  })
}

async function handleRevoke(req: Request): Promise<Response> {
  const user = await getAuthedUser(req)
  if (!user) return json(401, { error: 'unauthorized' })
  const body = await readBody(req)
  const id = str(body?.device_id, 60)
  if (!id) return json(400, { error: 'invalid_payload' })
  const { data, error } = await admin.from('ext_devices')
    .update({ revoked_at: new Date().toISOString(), revoke_reason: 'revogado pelo usuário' })
    .eq('id', id).eq('user_id', user.id).is('revoked_at', null).select('id, license_id').maybeSingle()
  if (error) return json(500, { error: 'internal' })
  if (!data) return json(404, { error: 'not_found' })
  await logEvent({ user_id: user.id, license_id: data.license_id, device_id: data.id, kind: 'revoke', ip_hash: await ipHash(req) })
  return json(200, { ok: true })
}

// ─── Rotas da extensão ───────────────────────────────────────────────────────

async function handleActivate(req: Request): Promise<Response> {
  const body = await readBody(req)
  const rawCode = str(body?.code, 20)
  if (!rawCode) return json(400, { error: 'invalid_payload' })
  const ip = await ipHash(req)

  // freio contra tentativa de adivinhar código: muitas recusas do mesmo IP em 10 min
  if (ip) {
    const since = new Date(Date.now() - 10 * 60_000).toISOString()
    const { count } = await admin.from('ext_license_events').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ip).eq('kind', 'activate_denied').gte('created_at', since)
    if ((count ?? 0) >= MAX_FAILED_ACTIVATIONS) return json(429, { error: 'too_many_attempts' })
  }

  const codeHash = await sha256Hex(normalizeCode(rawCode))
  const { data: pc } = await admin.from('ext_pairing_codes').select('id, user_id, expires_at, used_at').eq('code_hash', codeHash).maybeSingle()
  if (!pc || pc.used_at || new Date(pc.expires_at).getTime() <= Date.now()) {
    await logEvent({ kind: 'activate_denied', detail: 'código inválido ou expirado', ip_hash: ip })
    return json(400, { error: 'invalid_code' })
  }

  const lic = await loadLicense(pc.user_id)
  const problem = licenseProblem(lic)
  if (problem) {
    await logEvent({ user_id: pc.user_id, license_id: lic?.id, kind: 'activate_denied', detail: `licença: ${problem}`, ip_hash: ip })
    return json(403, { error: 'license_inactive', reason: problem })
  }
  const l = lic as LicenseRow

  const { count: active } = await admin.from('ext_devices').select('id', { count: 'exact', head: true }).eq('license_id', l.id).is('revoked_at', null)
  if ((active ?? 0) >= l.max_devices) {
    await logEvent({ user_id: l.user_id, license_id: l.id, kind: 'activate_denied', detail: `limite de dispositivos (${l.max_devices})`, ip_hash: ip })
    return json(409, { error: 'device_limit', max_devices: l.max_devices })
  }

  // consome o código de forma atômica (dois cliques simultâneos não ativam dois dispositivos)
  const { data: used } = await admin.from('ext_pairing_codes').update({ used_at: new Date().toISOString() }).eq('id', pc.id).is('used_at', null).select('id').maybeSingle()
  if (!used) return json(400, { error: 'invalid_code' })

  const deviceToken = makeDeviceToken()
  const { data: dev, error } = await admin.from('ext_devices').insert({
    license_id: l.id, user_id: l.user_id, token_hash: await sha256Hex(deviceToken),
    label: str(body?.label, 60), ext_version: str(body?.version, 20), last_ip_hash: ip,
  }).select('id').single()
  if (error || !dev) { console.error('[ext-license] insert device', error); return json(500, { error: 'internal' }) }

  const { token, exp } = await signLicenseToken(l, dev.id)
  await logEvent({ user_id: l.user_id, license_id: l.id, device_id: dev.id, kind: 'activate', ip_hash: ip })
  return json(200, { device_token: deviceToken, license_token: token, license: licenseView(l, exp) })
}

async function loadDevice(deviceToken: string | null) {
  if (!deviceToken || !deviceToken.startsWith('txp_ext_')) return null
  const { data } = await admin.from('ext_devices').select('id, license_id, user_id, revoked_at').eq('token_hash', await sha256Hex(deviceToken)).maybeSingle()
  return data
}

async function handleRefresh(req: Request): Promise<Response> {
  const body = await readBody(req)
  const dev = await loadDevice(str(body?.device_token, 80))
  const ip = await ipHash(req)
  if (!dev) return json(401, { error: 'invalid_device' })
  if (dev.revoked_at) {
    await logEvent({ user_id: dev.user_id, license_id: dev.license_id, device_id: dev.id, kind: 'refresh_denied', detail: 'dispositivo revogado', ip_hash: ip })
    return json(401, { error: 'device_revoked' })
  }
  const lic = await loadLicense(dev.user_id)
  const problem = licenseProblem(lic)
  if (problem) {
    await logEvent({ user_id: dev.user_id, license_id: dev.license_id, device_id: dev.id, kind: 'refresh_denied', detail: `licença: ${problem}`, ip_hash: ip })
    return json(403, { error: 'license_inactive', reason: problem })
  }
  await admin.from('ext_devices').update({ last_seen_at: new Date().toISOString(), last_ip_hash: ip, ext_version: str(body?.version, 20) }).eq('id', dev.id)
  const { token, exp } = await signLicenseToken(lic as LicenseRow, dev.id)
  return json(200, { license_token: token, license: licenseView(lic as LicenseRow, exp) })
}

async function handleDeactivate(req: Request): Promise<Response> {
  const body = await readBody(req)
  const dev = await loadDevice(str(body?.device_token, 80))
  if (!dev) return json(200, { ok: true }) // já não existe: idempotente
  if (!dev.revoked_at) {
    await admin.from('ext_devices').update({ revoked_at: new Date().toISOString(), revoke_reason: 'desativado na extensão' }).eq('id', dev.id)
    await logEvent({ user_id: dev.user_id, license_id: dev.license_id, device_id: dev.id, kind: 'deactivate', ip_hash: await ipHash(req) })
  }
  return json(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop()
  try {
    switch (route) {
      case 'pair': return await handlePair(req)
      case 'devices': return await handleDevices(req)
      case 'revoke': return await handleRevoke(req)
      case 'activate': return await handleActivate(req)
      case 'refresh': return await handleRefresh(req)
      case 'deactivate': return await handleDeactivate(req)
      default: return json(404, { error: 'not_found' })
    }
  } catch (e) {
    console.error('[ext-license] erro', e)
    return json(500, { error: 'internal' })
  }
})
