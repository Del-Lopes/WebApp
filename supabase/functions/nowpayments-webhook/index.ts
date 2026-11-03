// Supabase Edge Function — nowpayments-webhook
// Recebe o IPN da NOWPayments e credita os Coins.
//   POST /functions/v1/nowpayments-webhook   (Verify JWT DESLIGADO — é a NOWPayments quem chama)
//
// Segurança em 3 camadas:
//   1. Assinatura HMAC-SHA512 do corpo (chaves ordenadas) no header x-nowpayments-sig,
//      com NOWPAYMENTS_IPN_SECRET. Sem assinatura válida → 401.
//   2. Não confiamos no payload: consultamos o pagamento na API da NOWPayments e só
//      creditamos se status == finished, moeda BRL e valor >= preço do pedido.
//   3. credit_coin_order é idempotente (trava a linha) — reentrega não duplica.
//
// Secrets: NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET (+ NOWPAYMENTS_API_URL opcional).
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_KEY = Deno.env.get('NOWPAYMENTS_API_KEY') ?? ''
const API_URL = (Deno.env.get('NOWPAYMENTS_API_URL') ?? 'https://api.nowpayments.io/v1').replace(/\/+$/, '')
const IPN_SECRET = Deno.env.get('NOWPAYMENTS_IPN_SECRET') ?? ''

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

// A NOWPayments assina o JSON com as chaves em ordem alfabética (em todos os níveis).
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    )
  }
  return v
}

async function validSignature(payload: unknown, header: string | null): Promise<boolean> {
  if (!IPN_SECRET || !header) return false
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(IPN_SECRET), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(JSON.stringify(sortKeys(payload)))))
  const got = header.trim().toLowerCase()
  if (got.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ got.charCodeAt(i)   // tempo constante
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })

  let evt: { payment_id?: string | number; invoice_id?: string | number }
  try { evt = JSON.parse(await req.text()) } catch { return new Response('bad_json', { status: 400 }) }

  if (!(await validSignature(evt, req.headers.get('x-nowpayments-sig')))) {
    return new Response('invalid_signature', { status: 401 })
  }

  const paymentId = evt.payment_id
  if (!paymentId) return new Response('ignored', { status: 200 })

  // Estado real do pagamento, direto da fonte.
  const res = await fetch(`${API_URL}/payment/${encodeURIComponent(String(paymentId))}`, {
    headers: { 'x-api-key': API_KEY },
  })
  if (!res.ok) {
    console.error('[nowpayments-webhook] consulta pagamento', res.status)
    return new Response('upstream_error', { status: 502 })              // 5xx: a NOWPayments tenta de novo
  }
  const pay = await res.json()

  const orderId = typeof pay.order_id === 'string' ? pay.order_id : ''
  if (!orderId) return new Response('ignored', { status: 200 })

  const { data: order } = await admin
    .from('coin_orders').select('id, price_brl, status, credited_at, external_id')
    .eq('method', 'nowpayments').eq('id', orderId).maybeSingle()
  if (!order) return new Response('unknown_order', { status: 200 })     // 200: evita reentregas infinitas
  if (evt.invoice_id && order.external_id && String(evt.invoice_id) !== order.external_id) {
    return new Response('invoice_mismatch', { status: 200 })
  }
  if (order.credited_at) return new Response('already_credited', { status: 200 })

  if (pay.payment_status === 'finished') {
    if (String(pay.price_currency).toLowerCase() !== 'brl' || Number(pay.price_amount) + 0.001 < Number(order.price_brl)) {
      console.error('[nowpayments-webhook] valor/moeda divergente', orderId, pay.price_amount, pay.price_currency)
      return new Response('amount_mismatch', { status: 200 })
    }
    const { error } = await admin.rpc('credit_coin_order', { p_order_id: order.id })
    if (error) {
      console.error('[nowpayments-webhook] credit', error)
      return new Response('credit_error', { status: 500 })
    }
    return new Response('credited', { status: 200 })
  }

  if (pay.payment_status === 'expired') await admin.rpc('close_coin_order', { p_order_id: order.id, p_status: 'expired' })
  if (pay.payment_status === 'failed') await admin.rpc('close_coin_order', { p_order_id: order.id, p_status: 'failed' })
  return new Response('ok', { status: 200 })
})
