// Supabase Edge Function — asaas-webhook
// Recebe as notificações da Asaas (cartão de crédito) e credita os Coins.
//   POST /functions/v1/asaas-webhook       (Verify JWT DESLIGADO — é a Asaas quem chama)
//
// Segurança:
//   1. Header asaas-access-token precisa bater com ASAAS_WEBHOOK_TOKEN
//      (você define o token ao cadastrar o webhook no painel da Asaas).
//   2. Não confiamos no payload: consultamos o pagamento na API da Asaas e só
//      creditamos se status CONFIRMED/RECEIVED e valor >= preço do pedido.
//   3. credit_coin_order é idempotente.
//
// O pedido é achado pelo id do link de pagamento (payment.paymentLink), gravado
// em coin_orders.external_id pelo coin-checkout.
// Secrets: ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN (+ ASAAS_API_URL opcional).
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''
const ASAAS_API_URL = (Deno.env.get('ASAAS_API_URL') ?? 'https://api.asaas.com/v3').replace(/\/+$/, '')
const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? ''

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
const PAID_STATUS = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'])

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })

  const token = req.headers.get('asaas-access-token') ?? ''
  if (!WEBHOOK_TOKEN || !safeEqual(token, WEBHOOK_TOKEN)) return new Response('unauthorized', { status: 401 })

  let evt: { event?: string; payment?: { id?: string; paymentLink?: string | null } }
  try { evt = await req.json() } catch { return new Response('bad_json', { status: 400 }) }

  // Eventos que não nos interessam: 200 para a Asaas não pausar a fila.
  if (!evt.event || !PAID_EVENTS.has(evt.event)) return new Response('ignored', { status: 200 })
  const paymentId = evt.payment?.id
  const linkId = evt.payment?.paymentLink
  if (!paymentId || !linkId) return new Response('ignored', { status: 200 })

  const { data: order } = await admin
    .from('coin_orders').select('id, price_brl, credited_at')
    .eq('method', 'asaas').eq('external_id', linkId).maybeSingle()
  if (!order) return new Response('unknown_order', { status: 200 })
  if (order.credited_at) return new Response('already_credited', { status: 200 })

  const res = await fetch(`${ASAAS_API_URL}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { access_token: ASAAS_API_KEY, 'User-Agent': 'trader-afk' },
  })
  if (!res.ok) {
    console.error('[asaas-webhook] consulta pagamento', res.status)
    return new Response('upstream_error', { status: 502 })
  }
  const pay = await res.json()

  if (!PAID_STATUS.has(pay.status) || pay.paymentLink !== linkId) return new Response('not_paid', { status: 200 })
  if (Number(pay.value) + 0.001 < Number(order.price_brl)) {
    console.error('[asaas-webhook] valor divergente', paymentId, pay.value)
    return new Response('amount_mismatch', { status: 200 })
  }

  const { error } = await admin.rpc('credit_coin_order', { p_order_id: order.id })
  if (error) {
    console.error('[asaas-webhook] credit', error)
    return new Response('credit_error', { status: 500 })
  }
  return new Response('credited', { status: 200 })
})
