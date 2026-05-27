// Supabase Edge Function — mt5-ingest
// Recebe telemetria do Expert Advisor TradexperienceMonitor (MT5).
// Autentica via Bearer token (SHA-256 hash batido contra strategy_mt5_link).
// Atualiza strategy_mt5_status e, no máximo 1x/min por estratégia,
// insere uma linha em strategy_mt5_history.
//
// Deno runtime — fetch() only, no Node SDKs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// CORS — o EA não envia preflight (WebRequest do MT5 não é browser), mas
// deixamos aberto pra eventuais testes via fetch do navegador/curl.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-ea-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mínimo de 60s entre inserts em strategy_mt5_history por estratégia
const HISTORY_INTERVAL_SEC = 60

interface IngestPayload {
  ea_version?: string
  account_login: number
  account_currency?: string
  account_company?: string
  account_server?: string
  balance: number
  equity: number
  floating_pnl: number
  daily_pnl: number
  open_positions: number
  last_trade_at?: string | null
  terminal_hash?: string
  timestamp: string
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// SHA-256 hex — chave nunca sai daqui em texto plano
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

function isValidPayload(p: unknown): p is IngestPayload {
  if (!p || typeof p !== 'object') return false
  const obj = p as Record<string, unknown>
  return (
    typeof obj.account_login === 'number' &&
    Number.isFinite(obj.account_login) &&
    typeof obj.balance === 'number' &&
    typeof obj.equity === 'number' &&
    typeof obj.floating_pnl === 'number' &&
    typeof obj.daily_pnl === 'number' &&
    typeof obj.open_positions === 'number' &&
    typeof obj.timestamp === 'string'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // GET /mt5-ingest/link-id — EA busca o strategy_id uma vez para cache PostgREST
  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop()
  if (req.method === 'GET' && action === 'link-id') {
    const token = extractBearer(req)
    if (!token) return jsonResponse(401, { error: 'missing_bearer_token' })
    const tokenHash = await sha256Hex(token)
    const { data: link } = await supabaseAdmin
      .from('strategy_mt5_link')
      .select('strategy_id, api_key_revoked_at')
      .eq('api_key_hash', tokenHash)
      .maybeSingle()
    if (!link) return jsonResponse(401, { error: 'invalid_token' })
    if (link.api_key_revoked_at) return jsonResponse(403, { error: 'token_revoked' })
    return jsonResponse(200, { strategy_id: link.strategy_id })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' })
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const token = extractBearer(req)
  if (!token) {
    return jsonResponse(401, { error: 'missing_bearer_token' })
  }

  const tokenHash = await sha256Hex(token)

  // Tenta primeiro vincular como estratégia. Se não bater, tenta como tesouraria.
  const { data: strategyLink, error: strategyLinkErr } = await supabaseAdmin
    .from('strategy_mt5_link')
    .select('strategy_id, user_id, account_login, api_key_revoked_at')
    .eq('api_key_hash', tokenHash)
    .maybeSingle()

  if (strategyLinkErr) {
    console.error('[mt5-ingest] strategy link lookup error', strategyLinkErr)
    return jsonResponse(500, { error: 'internal_error' })
  }

  let treasuryLink: {
    account_id: string
    user_id: string
    account_login: number
    api_key_revoked_at: string | null
  } | null = null

  if (!strategyLink) {
    const { data: tLink, error: treasuryLinkErr } = await supabaseAdmin
      .from('treasury_mt5_link')
      .select('account_id, user_id, account_login, api_key_revoked_at')
      .eq('api_key_hash', tokenHash)
      .maybeSingle()

    if (treasuryLinkErr) {
      console.error('[mt5-ingest] treasury link lookup error', treasuryLinkErr)
      return jsonResponse(500, { error: 'internal_error' })
    }
    treasuryLink = tLink
  }

  const link = strategyLink ?? treasuryLink
  if (!link) {
    return jsonResponse(401, { error: 'invalid_token' })
  }

  if (link.api_key_revoked_at) {
    return jsonResponse(403, { error: 'token_revoked' })
  }

  // ─── Payload ───────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  if (!isValidPayload(body)) {
    return jsonResponse(400, { error: 'invalid_payload' })
  }
  const p = body

  // O account_login do payload precisa bater com o cadastrado no link.
  // Isso impede que uma chave seja reaproveitada pra alimentar dados de outra conta.
  if (Number(p.account_login) !== Number(link.account_login)) {
    console.warn('[mt5-ingest] account mismatch', {
      kind: strategyLink ? 'strategy' : 'treasury',
      expected: link.account_login,
      received: p.account_login,
    })
    return jsonResponse(403, { error: 'account_mismatch' })
  }

  // ─── Caminho da tesouraria: só atualiza equity em treasury_accounts.balance ───
  if (treasuryLink) {
    const reportedAt = p.timestamp

    // Contas "cent" (centavos) representam saldos em 1/100 da moeda da corretora.
    // O equity recebido vem na moeda da plataforma — dividimos por 100 antes de gravar.
    const { data: accountRow } = await supabaseAdmin
      .from('treasury_accounts')
      .select('is_cent')
      .eq('id', treasuryLink.account_id)
      .maybeSingle()

    const adjustedEquity = accountRow?.is_cent ? p.equity / 100 : p.equity

    const { error: balanceErr } = await supabaseAdmin
      .from('treasury_accounts')
      .update({ balance: adjustedEquity })
      .eq('id', treasuryLink.account_id)

    if (balanceErr) {
      console.error('[mt5-ingest] treasury balance update error', balanceErr)
      return jsonResponse(500, { error: 'treasury_update_failed' })
    }

    const { error: linkUpdErr } = await supabaseAdmin
      .from('treasury_mt5_link')
      .update({
        last_equity: adjustedEquity,
        last_reported_at: reportedAt,
      })
      .eq('account_id', treasuryLink.account_id)

    if (linkUpdErr) {
      console.error('[mt5-ingest] treasury link timestamp update error', linkUpdErr)
      // Não falhamos a request — o balance já foi atualizado.
    }

    return jsonResponse(200, { ok: true })
  }

  // ─── Caminho da estratégia (legado) ────────────────────────────────────────
  if (!strategyLink) {
    // Inalcançável pelo flow acima, mas o TS precisa do narrowing.
    return jsonResponse(500, { error: 'internal_error' })
  }

  // ─── Upsert do snapshot ────────────────────────────────────────────────────
  const reportedAt = p.timestamp
  const lastTradeAt = p.last_trade_at && p.last_trade_at.length > 0 ? p.last_trade_at : null

  // Upsert do snapshot e leitura do último histórico em paralelo
  const [{ error: upsertErr }, { data: lastHist }] = await Promise.all([
    supabaseAdmin
      .from('strategy_mt5_status')
      .upsert(
        {
          strategy_id: strategyLink.strategy_id,
          user_id: strategyLink.user_id,
          account_login: p.account_login,
          account_currency: p.account_currency ?? null,
          account_company: p.account_company ?? null,
          account_server: p.account_server ?? null,
          balance: p.balance,
          equity: p.equity,
          floating_pnl: p.floating_pnl,
          daily_pnl: p.daily_pnl,
          open_positions: p.open_positions,
          last_trade_at: lastTradeAt,
          ea_version: p.ea_version ?? null,
          terminal_hash: p.terminal_hash ?? null,
          reported_at: reportedAt,
          received_at: new Date().toISOString(),
          force_sync: false,
        },
        { onConflict: 'strategy_id' },
      ),
    supabaseAdmin
      .from('strategy_mt5_history')
      .select('recorded_at')
      .eq('strategy_id', strategyLink.strategy_id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (upsertErr) {
    console.error('[mt5-ingest] status upsert error', upsertErr)
    return jsonResponse(500, { error: 'status_upsert_failed' })
  }

  // ─── História (>=60s desde o último) ───────────────────────────────────────
  const now = Date.now()
  const lastTs = lastHist ? new Date(lastHist.recorded_at).getTime() : 0
  const shouldInsertHistory = now - lastTs >= HISTORY_INTERVAL_SEC * 1000

  if (shouldInsertHistory) {
    const { error: histErr } = await supabaseAdmin
      .from('strategy_mt5_history')
      .insert({
        strategy_id: strategyLink.strategy_id,
        user_id: strategyLink.user_id,
        equity: p.equity,
        balance: p.balance,
        floating_pnl: p.floating_pnl,
        daily_pnl: p.daily_pnl,
        open_positions: p.open_positions,
      })
    if (histErr) console.error('[mt5-ingest] history insert error', histErr)
  }

  return jsonResponse(200, { ok: true })
})
