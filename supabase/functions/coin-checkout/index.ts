// Supabase Edge Function — coin-checkout
// Cria um pedido de compra de Coins e a cobrança no meio de pagamento escolhido.
//   POST /functions/v1/coin-checkout   { package_id, method: 'nowpayments'|'asaas'|'depix' }
//     Authorization: Bearer <JWT do usuário>
//     → 200 { order_id, checkout_url }
//
// Exige login (verify_jwt ligado + getUser). Preço e quantidade de Coins vêm do
// banco (coin_packages) — o cliente só diz QUAL pacote. O crédito NÃO acontece
// aqui: só os webhooks (nowpayments-webhook / asaas-webhook) chamam credit_coin_order.
//
// Secrets: NOWPAYMENTS_API_KEY (+ NOWPAYMENTS_API_URL opcional; padrão produção),
//          ASAAS_API_KEY (+ ASAAS_API_URL opcional; padrão produção).
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const NOWPAYMENTS_API_KEY = Deno.env.get('NOWPAYMENTS_API_KEY') ?? ''
const NOWPAYMENTS_API_URL = (Deno.env.get('NOWPAYMENTS_API_URL') ?? 'https://api.nowpayments.io/v1').replace(/\/+$/, '')
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''
const ASAAS_API_URL = (Deno.env.get('ASAAS_API_URL') ?? 'https://api.asaas.com/v3').replace(/\/+$/, '')

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const MAX_PENDING_PER_HOUR = 6

const ALLOWED_ORIGINS = [
  /^https:\/\/([a-z0-9-]+\.)?(traderafk\.com|tradexperience\.com\.br)$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : 'https://traderafk.com'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

type Method = 'nowpayments' | 'asaas' | 'depix'

// ── NOWPayments: invoice em BRL, preço fixo; o cliente escolhe a moeda na página dela ──
async function createNowpaymentsInvoice(orderId: string, price: number, label: string, site: string) {
  const res = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
    method: 'POST',
    headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price_amount: price,
      price_currency: 'brl',
      order_id: orderId,
      order_description: label,
      ipn_callback_url: `${SUPABASE_URL}/functions/v1/nowpayments-webhook`,
      success_url: site,
      cancel_url: site,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
    }),
  })
  if (!res.ok) throw new Error(`nowpayments_${res.status}: ${(await res.text()).slice(0, 200)}`)
  const inv = await res.json()
  if (!inv?.id || !inv?.invoice_url) throw new Error('nowpayments_bad_response')
  return { externalId: String(inv.id), url: String(inv.invoice_url) }
}

// ── Asaas: link de pagamento avulso só para cartão de crédito ──
async function createAsaasLink(orderId: string, price: number, label: string) {
  const end = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10)
  const res = await fetch(`${ASAAS_API_URL}/paymentLinks`, {
    method: 'POST',
    headers: { access_token: ASAAS_API_KEY, 'Content-Type': 'application/json', 'User-Agent': 'trader-afk' },
    body: JSON.stringify({
      name: label,
      description: `Pedido ${orderId}`,
      billingType: 'CREDIT_CARD',
      chargeType: 'DETACHED',
      value: price,
      endDate: end,
      dueDateLimitDays: 1,
      notificationEnabled: false,
    }),
  })
  if (!res.ok) throw new Error(`asaas_${res.status}: ${(await res.text()).slice(0, 200)}`)
  const link = await res.json()
  if (!link?.id || !link?.url) throw new Error('asaas_bad_response')
  return { externalId: String(link.id), url: String(link.url) }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) return json(401, { error: 'not_authenticated' })
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json(401, { error: 'not_authenticated' })
  const userId = userData.user.id

  let body: { package_id?: unknown; method?: unknown }
  try { body = await req.json() } catch { return json(400, { error: 'invalid_body' }) }
  const packageId = typeof body.package_id === 'string' ? body.package_id : ''
  const method = body.method as Method
  if (!packageId || !['nowpayments', 'asaas', 'depix'].includes(method)) return json(400, { error: 'invalid_input' })

  // Meios sem configuração (ou ainda não implementados) respondem de forma clara.
  if (method === 'depix') return json(503, { error: 'method_unavailable' })
  if (method === 'nowpayments' && !NOWPAYMENTS_API_KEY) return json(503, { error: 'method_unavailable' })
  if (method === 'asaas' && !ASAAS_API_KEY) return json(503, { error: 'method_unavailable' })

  const { data: pkg } = await admin
    .from('coin_packages').select('id, name, price_brl, coins, active').eq('id', packageId).maybeSingle()
  if (!pkg || !pkg.active) return json(404, { error: 'package_not_found' })

  // Freio simples contra spam de cobranças pendentes.
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await admin
    .from('coin_orders').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'pending').gte('created_at', since)
  if ((count ?? 0) >= MAX_PENDING_PER_HOUR) return json(429, { error: 'too_many_pending' })

  const price = Number(pkg.price_brl)
  const { data: order, error: orderError } = await admin
    .from('coin_orders')
    .insert({ user_id: userId, package_id: pkg.id, coins: pkg.coins, price_brl: price, method })
    .select('id').single()
  if (orderError || !order) {
    console.error('[coin-checkout] insert order', orderError)
    return json(500, { error: 'order_failed' })
  }

  const label = `${pkg.coins} Coins — ${pkg.name}`
  const site = origin && ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : 'https://traderafk.com'

  try {
    const charge = method === 'nowpayments'
      ? await createNowpaymentsInvoice(order.id, price, label, site)
      : await createAsaasLink(order.id, price, label)

    const { error: updError } = await admin
      .from('coin_orders').update({ external_id: charge.externalId, checkout_url: charge.url }).eq('id', order.id)
    if (updError) throw updError

    return json(200, { order_id: order.id, checkout_url: charge.url })
  } catch (e) {
    console.error('[coin-checkout] gateway', method, e)
    await admin.rpc('close_coin_order', { p_order_id: order.id, p_status: 'failed' })
    return json(502, { error: 'gateway_error' })
  }
})
