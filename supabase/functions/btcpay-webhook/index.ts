// Supabase Edge Function — btcpay-webhook
// Recebe os eventos do BTCPay Server (self-hosted) e credita os Coins.
//   POST /functions/v1/btcpay-webhook      (Verify JWT DESLIGADO — é o BTCPay quem chama)
//
// Segurança em 3 camadas:
//   1. Assinatura HMAC-SHA256 do corpo bruto (header BTCPay-Sig: sha256=<hex>)
//      com BTCPAY_WEBHOOK_SECRET. Sem assinatura válida → 401.
//   2. Não confiamos no payload: consultamos a invoice na API do BTCPay e só
//      creditamos se status == Settled, moeda BRL e valor >= preço do pedido.
//   3. credit_coin_order é idempotente (trava a linha) — reentrega não duplica.
//
// Secrets: BTCPAY_URL, BTCPAY_STORE_ID, BTCPAY_API_KEY, BTCPAY_WEBHOOK_SECRET.
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BTCPAY_URL = (Deno.env.get('BTCPAY_URL') ?? '').replace(/\/+$/, '')
const BTCPAY_STORE_ID = Deno.env.get('BTCPAY_STORE_ID') ?? ''
const BTCPAY_API_KEY = Deno.env.get('BTCPAY_API_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('BTCPAY_WEBHOOK_SECRET') ?? ''

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET || !header) return false
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = 'sha256=' + hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
  const got = header.trim().toLowerCase()
  if (got.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ got.charCodeAt(i)   // tempo constante
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })

  const raw = await req.text()
  if (!(await validSignature(raw, req.headers.get('btcpay-sig')))) {
    return new Response('invalid_signature', { status: 401 })
  }

  let evt: { type?: string; invoiceId?: string; storeId?: string }
  try { evt = JSON.parse(raw) } catch { return new Response('bad_json', { status: 400 }) }

  const invoiceId = evt.invoiceId
  if (!invoiceId || (evt.storeId && evt.storeId !== BTCPAY_STORE_ID)) return new Response('ignored', { status: 200 })

  const { data: order } = await admin
    .from('coin_orders').select('id, price_brl, status, credited_at')
    .eq('method', 'btcpay').eq('external_id', invoiceId).maybeSingle()
  if (!order) return new Response('unknown_order', { status: 200 })     // 200: evita reentregas infinitas
  if (order.credited_at) return new Response('already_credited', { status: 200 })

  // Estado real da invoice, direto da fonte.
  const res = await fetch(`${BTCPAY_URL}/api/v1/stores/${BTCPAY_STORE_ID}/invoices/${invoiceId}`, {
    headers: { Authorization: `token ${BTCPAY_API_KEY}` },
  })
  if (!res.ok) {
    console.error('[btcpay-webhook] consulta invoice', res.status)
    return new Response('upstream_error', { status: 502 })              // 5xx: o BTCPay tenta de novo
  }
  const inv = await res.json()

  if (inv.status === 'Settled') {
    if (inv.currency !== 'BRL' || Number(inv.amount) + 0.001 < Number(order.price_brl)) {
      console.error('[btcpay-webhook] valor/moeda divergente', invoiceId, inv.amount, inv.currency)
      return new Response('amount_mismatch', { status: 200 })
    }
    const { error } = await admin.rpc('credit_coin_order', { p_order_id: order.id })
    if (error) {
      console.error('[btcpay-webhook] credit', error)
      return new Response('credit_error', { status: 500 })
    }
    return new Response('credited', { status: 200 })
  }

  if (inv.status === 'Expired') await admin.rpc('close_coin_order', { p_order_id: order.id, p_status: 'expired' })
  if (inv.status === 'Invalid') await admin.rpc('close_coin_order', { p_order_id: order.id, p_status: 'failed' })
  return new Response('ok', { status: 200 })
})
