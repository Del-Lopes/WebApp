// Supabase Edge Function — crypto-narrative
// Relatório de Narrativa cripto por IA, pago em Coins.
//
// Fluxo (usuário logado):
//   1. Autentica pelo JWT (Verify JWT LIGADO).
//   2. Cobra o relatório em Coins (RPC charge_crypto_report, transacional).
//   3. Busca setores (narrativas) + trending no CoinGecko (server-side).
//   4. A IA redige um panorama (cascata Gemini→Groq de ai_configurations).
//   5. Grava em crypto_reports (privado) e retorna.
//
// Enquadramento: inteligência de mercado data-driven, NUNCA recomendação de
// compra. O prompt instrui a IA a não indicar moedas para comprar.
//
// Deno runtime — fetch() only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? ''
const COINGECKO_KEY = Deno.env.get('COINGECKO_KEY') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function corsFor(req: Request): Record<string, string> {
  const requested = req.headers.get('access-control-request-headers')
  return { ...corsHeaders, ...(requested ? { 'Access-Control-Allow-Headers': requested } : {}) }
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
}

// ─── CoinGecko (server-side) ─────────────────────────────────────────────────

const CG_BASE = 'https://api.coingecko.com/api/v3'
async function cg(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(CG_BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  if (COINGECKO_KEY) url.searchParams.set('x_cg_demo_api_key', COINGECKO_KEY)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`coingecko_http_${res.status}`)
  return res.json()
}

interface Sector { name: string; change24h: number; marketCap: number }

async function fetchSectors(): Promise<Sector[]> {
  const json = await cg('/coins/categories', { order: 'market_cap_change_24h_desc' })
  const arr = Array.isArray(json) ? json : []
  return arr
    .filter((c: any) => typeof c.market_cap_change_24h === 'number' && c.market_cap > 0)
    .map((c: any): Sector => ({ name: c.name, change24h: c.market_cap_change_24h, marketCap: c.market_cap }))
}

async function fetchTrending(): Promise<string[]> {
  const json = await cg('/search/trending')
  const coins = Array.isArray(json?.coins) ? json.coins : []
  return coins.map((c: any) => `${c.item?.name} (${(c.item?.symbol ?? '').toUpperCase()})`).filter(Boolean)
}

// ─── IA (cascata Gemini → Groq) ──────────────────────────────────────────────

async function callGemini(system: string, user: string, apiKey: string, model: string): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.6 },
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } finally { clearTimeout(t) }
}

async function callGroq(system: string, user: string, apiKey: string, model: string): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.6 }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    if (!text) throw new Error('Empty Groq response')
    return text
  } finally { clearTimeout(t) }
}

interface AIConfig {
  gemini_api_key?: string; gemini_model?: string; gemini_model_2?: string; gemini_model_3?: string
  groq_api_key?: string; groq_model?: string
}
async function generateText(system: string, user: string, config: AIConfig): Promise<string | null> {
  const geminiKey = config.gemini_api_key || GEMINI_API_KEY
  if (geminiKey) {
    const models = [config.gemini_model || 'gemini-2.0-flash-lite', config.gemini_model_2, config.gemini_model_3].filter(Boolean) as string[]
    for (const m of models) {
      try { return await callGemini(system, user, geminiKey, m) }
      catch (e) { console.error('[crypto-narrative] gemini failed', m, e instanceof Error ? e.message : e) }
    }
  }
  const groqKey = config.groq_api_key || GROQ_API_KEY
  if (groqKey) {
    try { return await callGroq(system, user, groqKey, config.groq_model || 'llama-3.3-70b-versatile') }
    catch (e) { console.error('[crypto-narrative] groq failed', e) }
  }
  return null
}

function buildPrompt(sectors: Sector[], trending: string[]): string {
  const up = sectors.slice(0, 8).map((s) => `${s.name}: ${s.change24h >= 0 ? '+' : ''}${s.change24h.toFixed(1)}%`).join('\n')
  const down = sectors.slice(-5).map((s) => `${s.name}: ${s.change24h.toFixed(1)}%`).join('\n')
  const trend = trending.slice(0, 8).join(', ')
  return `Você é um analista de mercado cripto. Escreva um PANORAMA de narrativas em Português Brasileiro (4 a 6 parágrafos curtos) para um público que quer entender as TENDÊNCIAS do momento — quais setores estão aquecendo e por quê.

Setores com maior alta de capitalização (24h):
${up}

Setores em queda (24h):
${down}

Moedas em trending (mais buscadas agora): ${trend}

Instruções:
- Comece dizendo quais NARRATIVAS/SETORES estão ganhando força e o que costuma significar (ex.: IA, DePIN, RWA, memecoins, etc.).
- Contextualize: por que esse setor pode estar em alta (fundamentos, ciclo, fluxo de capital).
- Comente o que o trending sugere sobre a atenção do varejo.
- Dê um panorama de risco: lembre que rotação de narrativa é volátil e que a maioria dos projetos novos fracassa.
- Termine com uma orientação de MÉTODO para o leitor pesquisar por conta (tokenomics, unlocks, liquidez, atividade de desenvolvimento) — NÃO indique moedas específicas para comprar.
- Deixe explícito que é conteúdo informativo/educacional, NÃO recomendação de investimento.
- Texto corrido, sem markdown, sem títulos, sem bullet points.`
}

function fallbackReport(sectors: Sector[], trending: string[]): string {
  const top = sectors.slice(0, 5).map((s) => `${s.name} (${s.change24h >= 0 ? '+' : ''}${s.change24h.toFixed(1)}%)`).join(', ')
  return `Panorama de narrativas cripto (dados de mercado): os setores com maior alta de capitalização nas últimas 24h foram ${top}. `
    + `Moedas em destaque na busca: ${trending.slice(0, 5).join(', ')}. `
    + `A rotação entre narrativas é rápida e volátil — um setor aquecido hoje pode esfriar em dias. Antes de qualquer decisão, pesquise tokenomics, cronograma de unlocks, liquidez e atividade de desenvolvimento do projeto. `
    + `Este é um conteúdo informativo e educacional, não uma recomendação de investimento.`
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return jsonResponse(401, { error: 'missing_bearer_token' })
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return jsonResponse(401, { error: 'invalid_token' })
  const userId = userData.user.id

  // Cobra o relatório (sempre — é entregue).
  const { data: newBalance, error: chargeErr } = await userClient.rpc('charge_crypto_report')
  if (chargeErr) {
    const msg = chargeErr.message || ''
    if (msg.includes('insufficient_coins')) return jsonResponse(402, { error: 'insufficient_coins' })
    console.error('[crypto-narrative] charge', chargeErr)
    return jsonResponse(500, { error: 'charge_failed' })
  }

  // Dados de mercado. Se o CoinGecko cair, estornamos.
  let sectors: Sector[], trending: string[]
  try {
    [sectors, trending] = await Promise.all([fetchSectors(), fetchTrending()])
  } catch (e) {
    console.error('[crypto-narrative] coingecko', e)
    await supabaseAdmin.rpc('refund_crypto_report', { p_user_id: userId }).catch(() => {})
    return jsonResponse(502, { error: 'market_data_failed' })
  }
  if (!sectors.length) {
    await supabaseAdmin.rpc('refund_crypto_report', { p_user_id: userId }).catch(() => {})
    return jsonResponse(502, { error: 'insufficient_data' })
  }

  const { data: aiConfig } = await supabaseAdmin.from('ai_configurations').select('*').maybeSingle()
  const system = 'Você é um analista de narrativas cripto, informativo e conservador. Nunca recomenda comprar moedas específicas nem promete lucro.'
  const aiText = await generateText(system, buildPrompt(sectors, trending), aiConfig || {})
  const content = (aiText?.trim()) || fallbackReport(sectors, trending)

  const title = `Panorama de narrativas — ${new Date().toLocaleDateString('pt-BR')}`
  const meta = {
    top_sectors: sectors.slice(0, 8).map((s) => ({ name: s.name, change24h: s.change24h })),
    trending: trending.slice(0, 8),
  }

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('crypto_reports')
    .insert({ user_id: userId, title, content, meta })
    .select('*')
    .single()

  if (insertErr) {
    console.error('[crypto-narrative] insert', insertErr)
    await supabaseAdmin.rpc('refund_crypto_report', { p_user_id: userId }).catch(() => {})
    return jsonResponse(500, { error: 'insert_failed' })
  }

  return jsonResponse(200, { ok: true, new_balance: newBalance, report: inserted })
})
