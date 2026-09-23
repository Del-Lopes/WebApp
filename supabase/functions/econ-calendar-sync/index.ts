// Supabase Edge Function — econ-calendar-sync
//
// Coleta o calendário econômico do TradingView (eventos de média e alta
// importância, mais os indicadores-chave de econ_key_indicator) e interpreta
// cada indicador com IA.
//
//   POST|GET /functions/v1/econ-calendar-sync
//     → { ok: true, skipped: boolean, events?: n, profiles?: n, interpreted?: n }
//
// Fonte: endpoint JSON que o widget de calendário do TradingView usa
// (economic-calendar.tradingview.com). Não é API pública documentada — se o
// formato mudar, o sync falha, o app continua mostrando o que está no banco e o
// erro fica em econ_calendar_sync.last_error.
// Por que não o Investing.com: o Cloudflare dele bloqueia IPs de datacenter
// (403 sempre a partir do Supabase). O TradingView responde normalmente.
//
// Importância: a régua é nossa, não a do TradingView, que classifica como
// "baixa" dados que o trader brasileiro considera centrais (IPCA-15, CAGED,
// IGP-M). Vale a maior entre a do TradingView (alta → 3★, média → 2★) e a lista
// econ_key_indicator; "baixa" só entra se estiver na lista.
//
// Interpretação: uma por INDICADOR (país + título normalizado), não por
// divulgação — o CPI de setembro e o de outubro têm a mesma leitura de cenários.
// Gerada uma vez, em lotes pequenos, e reaproveitada por todos os usuários.
// Também traz o título em português.
//
// Frequência: trava global de 60s (RPC econ_calendar_claim_sync). O cron chama a
// cada 5 min e o app chama enquanto a sessão está aberta; chamadas dentro da
// janela são no-op.
//
// Requer "Verify JWT" DESLIGADO: o agendador chama sem JWT de usuário. A função
// não aceita entrada do chamador e só grava dado público.
//
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

const MIN_INTERVAL_SECONDS = 60
const WINDOW_PAST_DAYS = 3
const WINDOW_FUTURE_DAYS = 8
// Primeira execução (tabela vazia): puxa um mês e meio para o histórico de cada
// indicador já nascer com algumas divulgações.
const BACKFILL_DAYS = 45
// A API corta a resposta em 2000 eventos; blocos de 7 dias ficam bem abaixo.
const CHUNK_DAYS = 7
const INTERPRET_BATCH = 5
// Orçamento de tempo para a IA — a coleta já aconteceu, o resto fica para a
// próxima execução.
const INTERPRET_BUDGET_MS = 90_000
// Falhou ao interpretar? Tenta de novo depois disso, para não queimar cota em loop.
const INTERPRET_RETRY_MS = 6 * 3600_000

// ─── TradingView ─────────────────────────────────────────────────────────────

const TV_BASE = 'https://economic-calendar.tradingview.com/events'

// Países acompanhados. Sem filtro a API devolve ~100 países, quase todos com
// eventos irrelevantes para o público do app.
const TV_COUNTRIES = [
  'US', 'EU', 'DE', 'FR', 'IT', 'ES', 'GB', 'JP', 'CN', 'BR',
  'CA', 'AU', 'NZ', 'CH', 'MX', 'ZA', 'SE', 'NO', 'IN', 'KR',
]

interface TvEvent {
  id: string
  title: string
  country: string
  currency?: string
  indicator?: string
  ticker?: string
  category?: string
  period?: string
  source?: string
  source_url?: string
  comment?: string
  actual?: number | null
  forecast?: number | null
  previous?: number | null
  unit?: string | null
  scale?: string | null
  importance: number // -1 baixa · 0 média · 1 alta
  date: string
}

async function fetchTradingView(start: Date, end: Date): Promise<TvEvent[]> {
  const all: TvEvent[] = []
  for (let from = start.getTime(); from < end.getTime(); from += CHUNK_DAYS * 86_400_000) {
    const to = Math.min(from + CHUNK_DAYS * 86_400_000, end.getTime())
    const url = new URL(TV_BASE)
    url.searchParams.set('from', new Date(from).toISOString())
    url.searchParams.set('to', new Date(to).toISOString())
    url.searchParams.set('countries', TV_COUNTRIES.join(','))

    const res = await fetch(url.toString(), {
      headers: {
        // Sem Origin do TradingView a API recusa a chamada.
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`tradingview_http_${res.status}`)
    const json = await res.json()
    if (json?.status !== 'ok' || !Array.isArray(json.result)) throw new Error('tradingview_bad_payload')
    all.push(...json.result)
  }
  // Blocos se tocam na borda: remove repetidos.
  const seen = new Set<string>()
  return all.filter((e) => e?.id && !seen.has(e.id) && seen.add(e.id))
}

// ─── Normalização ────────────────────────────────────────────────────────────

// Sufixos de versão da mesma divulgação. Removidos da chave para que prévia e
// final do PIB, por exemplo, sejam o mesmo indicador (mesma interpretação e
// histórico contínuo).
const VARIANTS: [RegExp, string][] = [
  [/\s+(Adv|Advance)$/i, 'Preliminar'],
  [/\s+(Prel|Preliminary)$/i, 'Preliminar'],
  [/\s+Flash$/i, 'Prévia'],
  [/\s+(2nd|Second) Est(imate)?$/i, '2ª estimativa'],
  [/\s+(3rd|Third) Est(imate)?$/i, '3ª estimativa'],
  [/\s+Final$/i, 'Final'],
]

function splitVariant(title: string): { base: string; variant: string | null } {
  const t = title.trim()
  for (const [re, label] of VARIANTS) {
    if (re.test(t)) return { base: t.replace(re, '').trim(), variant: label }
  }
  return { base: t, variant: null }
}

const eventKey = (country: string, base: string) => `${country}:${base}`

// Tipo qualitativo pelo título: discursos e atas/relatórios não têm número.
function eventType(title: string, hasNumbers: boolean): string | null {
  if (hasNumbers) return null
  if (/speech|speaks|testimony|press conference|hearing/i.test(title)) return 'speech'
  if (/minutes|meeting|readout|report|statement|summary|outlook/i.test(title)) return 'report'
  return null
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// O TradingView não informa precisão; usa as casas decimais do próprio dado.
function precisionOf(...vals: (number | null)[]): number {
  let p = 0
  for (const v of vals) {
    if (v == null) continue
    const dec = (String(v).split('.')[1] ?? '').length
    p = Math.max(p, dec)
  }
  return Math.min(p, 3)
}

// 'K', 'M', 'B' vêm em scale; '%' em unit. Símbolo de moeda é omitido — a moeda
// do evento já aparece na linha.
function unitOf(e: TvEvent): string | null {
  const u = (e.scale ?? '') + (e.unit === '%' ? '%' : '')
  return u || null
}

interface KeyIndicator { country: string; pattern: string; importance: number }

// Padrão LIKE (% e _) → regex ancorada, sem diferenciar maiúsculas.
function likeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}

function importanceFor(e: TvEvent, base: string, keys: { country: string; re: RegExp; importance: number }[]): number | null {
  let imp = e.importance >= 1 ? 3 : e.importance === 0 ? 2 : 0
  for (const k of keys) {
    if (k.country === e.country && k.re.test(base)) imp = Math.max(imp, k.importance)
  }
  return imp >= 2 ? imp : null
}

// ─── IA (cascata Gemini → Groq, mesma configuração dos outros módulos) ──────

async function callGemini(system: string, user: string, apiKey: string, model: string): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
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
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
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

// Tenta cada modelo até obter um JSON válido — um modelo que devolve JSON
// quebrado conta como falha e passa a vez ao próximo.
async function generateInterpretation(system: string, user: string, config: AIConfig): Promise<Interpretation | null> {
  const attempts: Array<() => Promise<string>> = []
  const geminiKey = config.gemini_api_key || GEMINI_API_KEY
  if (geminiKey) {
    const models = [config.gemini_model || 'gemini-2.0-flash-lite', config.gemini_model_2, config.gemini_model_3].filter(Boolean) as string[]
    for (const m of models) attempts.push(() => callGemini(system, user, geminiKey, m))
  }
  const groqKey = config.groq_api_key || GROQ_API_KEY
  if (groqKey) attempts.push(() => callGroq(system, user, groqKey, config.groq_model || 'llama-3.3-70b-versatile'))

  for (const attempt of attempts) {
    try {
      const parsed = normalizeInterpretation(JSON.parse(stripFences(await attempt())))
      if (parsed) return parsed
    } catch (e) {
      console.error('[econ-calendar-sync] ai attempt failed', e instanceof Error ? e.message : e)
    }
  }
  return null
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
}

// ─── Interpretação: formato e validação ─────────────────────────────────────

type Dir = 'alta' | 'baixa' | 'neutra'
interface Scenario {
  rotulo: string
  moeda: Dir
  intensidade: 'forte' | 'moderada' | 'fraca'
  leitura: string
  ativos: { ativo: string; direcao: Dir }[]
}
interface Interpretation {
  titulo: string
  tipo: 'dado' | 'qualitativo'
  resumo: string
  contexto: string
  cenarios: { acima: Scenario; abaixo: Scenario; em_linha: Scenario }
  atencao: string
}

const asDir = (v: unknown): Dir => (v === 'alta' || v === 'baixa' ? v : 'neutra')
const asStr = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function normalizeScenario(raw: any, fallbackLabel: string): Scenario | null {
  if (!raw || typeof raw !== 'object') return null
  const leitura = asStr(raw.leitura)
  if (!leitura) return null
  const intensidade = raw.intensidade === 'forte' || raw.intensidade === 'fraca' ? raw.intensidade : 'moderada'
  const ativos = Array.isArray(raw.ativos)
    ? raw.ativos
        .map((a: any) => ({ ativo: asStr(a?.ativo), direcao: asDir(a?.direcao) }))
        .filter((a: { ativo: string }) => a.ativo)
        .slice(0, 6)
    : []
  return { rotulo: asStr(raw.rotulo) || fallbackLabel, moeda: asDir(raw.moeda), intensidade, leitura, ativos }
}

function normalizeInterpretation(raw: any): Interpretation | null {
  if (!raw || typeof raw !== 'object') return null
  const tipo = raw.tipo === 'qualitativo' ? 'qualitativo' : 'dado'
  const c = raw.cenarios ?? {}
  const acima = normalizeScenario(c.acima, tipo === 'dado' ? 'Acima do esperado' : 'Tom mais duro (hawkish)')
  const abaixo = normalizeScenario(c.abaixo, tipo === 'dado' ? 'Abaixo do esperado' : 'Tom mais brando (dovish)')
  const emLinha = normalizeScenario(c.em_linha, tipo === 'dado' ? 'Em linha com o esperado' : 'Sem sinalização nova')
  const titulo = asStr(raw.titulo)
  const resumo = asStr(raw.resumo)
  const contexto = asStr(raw.contexto)
  if (!acima || !abaixo || !emLinha || !titulo || !resumo || !contexto) return null
  return { titulo, tipo, resumo, contexto, cenarios: { acima, abaixo, em_linha: emLinha }, atencao: asStr(raw.atencao) }
}

// Ativos que o público do app (trader BR, MT5) acompanha, por moeda do evento.
const ASSETS_BY_CURRENCY: Record<string, string> = {
  USD: 'DXY, EUR/USD, USD/JPY, Ouro (XAU/USD), S&P 500 / Nasdaq, Mini Dólar (WDO), Mini Índice (WIN)',
  BRL: 'USD/BRL, Mini Dólar (WDO), Mini Índice (WIN) / Ibovespa, juros futuros (DI)',
  EUR: 'EUR/USD, EUR/JPY, DAX, Euro Stoxx 50',
  GBP: 'GBP/USD, EUR/GBP, FTSE 100',
  JPY: 'USD/JPY, EUR/JPY, Nikkei 225',
  CNY: 'USD/CNH, AUD/USD, cobre, minério de ferro, Mini Índice (WIN) via Vale/commodities',
  AUD: 'AUD/USD, AUD/JPY, ASX 200',
  NZD: 'NZD/USD, AUD/NZD',
  CAD: 'USD/CAD, petróleo (WTI)',
  CHF: 'USD/CHF, EUR/CHF, Ouro',
}

const COUNTRY_PT: Record<string, string> = {
  US: 'Estados Unidos', EU: 'Zona do Euro', DE: 'Alemanha', FR: 'França', IT: 'Itália', ES: 'Espanha',
  GB: 'Reino Unido', JP: 'Japão', CN: 'China', BR: 'Brasil', CA: 'Canadá', AU: 'Austrália',
  NZ: 'Nova Zelândia', CH: 'Suíça', MX: 'México', ZA: 'África do Sul', SE: 'Suécia', NO: 'Noruega',
  IN: 'Índia', KR: 'Coreia do Sul',
}

function buildPrompt(p: ProfileRow, sample: TvEvent | undefined): string {
  const assets = ASSETS_BY_CURRENCY[p.currency] ?? `pares com ${p.currency}, índice de ações local`
  const qualitative = p.event_type === 'speech' || p.event_type === 'report'
  const sampleLine = sample && (num(sample.previous) != null || num(sample.forecast) != null)
    ? `Divulgação mais próxima: anterior ${sample.previous ?? '—'}${unitOf(sample) ?? ''}, projeção ${sample.forecast ?? '—'}${unitOf(sample) ?? ''}.`
    : ''

  return `Indicador do calendário econômico:
- Nome original (inglês): ${p.title}
- País: ${COUNTRY_PT[p.country] ?? p.country} · Moeda: ${p.currency}
- Categoria: ${p.category ?? '—'}
- Importância: ${p.importance} estrelas (de 3)
- Tipo: ${qualitative ? 'qualitativo (discurso, ata ou relatório — sem número a comparar)' : 'dado numérico (atual × projeção × anterior)'}
- Descrição da fonte: ${p.description ?? '—'}
${sampleLine}

Ativos relevantes para o público (trader brasileiro que opera forex, índices e B3): ${assets}

Escreva a interpretação deste indicador para um trader. Devolva SOMENTE um JSON neste formato:
{
  "titulo": "nome do indicador em português como o mercado brasileiro chama (ex.: 'Payroll', 'IPC (CPI) anual', 'IPCA-15 mensal', 'Decisão de juros do BCE', 'Discurso de Powell'), sem o nome do país",
  "tipo": "${qualitative ? 'qualitativo' : 'dado'}",
  "resumo": "o que o indicador mede, em 1-2 frases simples",
  "contexto": "por que o mercado acompanha: relação com inflação, juros, política do banco central, crescimento; como costuma mexer o preço (2-4 frases)",
  "cenarios": {
    "acima": { "rotulo": "${qualitative ? 'Tom mais duro (hawkish)' : 'Acima do esperado'}", "moeda": "alta|baixa|neutra", "intensidade": "forte|moderada|fraca", "leitura": "o que o mercado entende e a reação típica (1-3 frases)", "ativos": [{ "ativo": "nome", "direcao": "alta|baixa|neutra" }] },
    "abaixo": { mesmo formato, "rotulo": "${qualitative ? 'Tom mais brando (dovish)' : 'Abaixo do esperado'}" },
    "em_linha": { mesmo formato, "rotulo": "${qualitative ? 'Sem sinalização nova' : 'Em linha com o esperado'}" }
  },
  "atencao": "armadilhas de leitura: revisão do dado anterior, núcleo vs cheio, componentes, mercado já precificado, volatilidade no minuto da divulgação (1-3 frases)"
}

Regras:
- "moeda" é a direção esperada de ${p.currency} naquele cenário.
- Atenção à polaridade: em indicadores onde número MAIOR é notícia RUIM para a economia (desemprego, pedidos de seguro-desemprego, estoques, déficit), "acima" tende a ser NEGATIVO para a moeda. Em inflação, número maior costuma ser positivo para a moeda (expectativa de juros mais altos).
- "intensidade" reflete o peso do indicador (3 estrelas com surpresa grande tende a "forte"; 2 estrelas tende a "moderada"; em linha tende a "fraca").
- Em "ativos", 3 a 5 itens da lista de ativos relevantes, com a direção coerente com a moeda (ex.: USD em alta → EUR/USD em baixa, WDO em alta).
- Linguagem de probabilidade ("tende a", "costuma"), nunca certeza. Não recomende compra ou venda.
- Português do Brasil, sem markdown.`
}

// ─── Handler ─────────────────────────────────────────────────────────────────

interface ProfileRow {
  event_key: string
  country: string
  title: string
  currency: string
  category: string | null
  event_type: string | null
  importance: number
  description: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('access-control-request-headers')
    return new Response('ok', {
      headers: { ...corsHeaders, ...(reqHeaders ? { 'Access-Control-Allow-Headers': reqHeaders } : {}) },
    })
  }

  const startedAt = Date.now()

  const { data: claimed, error: claimErr } = await supabaseAdmin.rpc('econ_calendar_claim_sync', { p_min_seconds: MIN_INTERVAL_SECONDS })
  if (claimErr) {
    console.error('[econ-calendar-sync] claim error', claimErr)
    return jsonResponse(500, { error: 'internal_error' })
  }
  if (!claimed) return jsonResponse(200, { ok: true, skipped: true })

  const fail = async (status: number, error: string, detail?: string) => {
    await supabaseAdmin.from('econ_calendar_sync').update({ last_error: detail ?? error }).eq('id', 1)
    return jsonResponse(status, { error, ...(detail ? { detail } : {}) })
  }

  // ── 1. Coleta ──
  const [{ count: existing }, { data: keyRows }] = await Promise.all([
    supabaseAdmin.from('econ_calendar_event').select('occurrence_id', { count: 'exact', head: true }),
    supabaseAdmin.from('econ_key_indicator').select('country, pattern, importance'),
  ])
  const keys = ((keyRows ?? []) as KeyIndicator[]).map((k) => ({ country: k.country, re: likeToRegex(k.pattern), importance: k.importance }))

  const now = Date.now()
  const pastDays = (existing ?? 0) === 0 ? BACKFILL_DAYS : WINDOW_PAST_DAYS
  const start = new Date(now - pastDays * 86_400_000)
  const end = new Date(now + WINDOW_FUTURE_DAYS * 86_400_000)

  let raw: TvEvent[]
  try {
    raw = await fetchTradingView(start, end)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[econ-calendar-sync] fetch failed', msg)
    return fail(502, 'source_fetch_failed', msg)
  }

  interface Selected { e: TvEvent; key: string; base: string; variant: string | null; importance: number }
  const selected: Selected[] = []
  for (const e of raw) {
    if (!e?.id || !e.title || !e.country || !e.date) continue
    const { base, variant } = splitVariant(e.title)
    const importance = importanceFor(e, base, keys)
    if (importance == null) continue
    selected.push({ e, key: eventKey(e.country, base), base, variant, importance })
  }

  // Um perfil por indicador. A importância do perfil é a maior entre as
  // divulgações vistas (a prévia do PMI pode vir média e o final, alta).
  const profiles = new Map<string, ProfileRow & { source: string | null; source_url: string | null; updated_at: string }>()
  const hasNumbers = new Map<string, boolean>()
  for (const s of selected) {
    const numeric = num(s.e.actual) != null || num(s.e.forecast) != null || num(s.e.previous) != null
    hasNumbers.set(s.key, (hasNumbers.get(s.key) ?? false) || numeric)
  }
  for (const s of selected) {
    const prev = profiles.get(s.key)
    if (prev && prev.importance >= s.importance) continue
    profiles.set(s.key, {
      event_key: s.key,
      country: s.e.country,
      currency: s.e.currency || '—',
      title: s.base,
      category: s.e.category ?? null,
      event_type: eventType(s.base, hasNumbers.get(s.key) ?? false),
      importance: s.importance,
      description: s.e.comment?.trim() || null,
      source: s.e.source ?? null,
      source_url: s.e.source_url ?? null,
      updated_at: new Date().toISOString(),
    })
  }

  const occurrenceRows = selected.map((s) => {
    const actual = num(s.e.actual), forecast = num(s.e.forecast), previous = num(s.e.previous)
    return {
      occurrence_id: s.e.id,
      event_key: s.key,
      occurs_at: s.e.date,
      country: s.e.country,
      currency: s.e.currency || '—',
      title: s.e.title,
      variant: s.variant,
      importance: s.importance,
      unit: unitOf(s.e),
      precision: precisionOf(actual, forecast, previous),
      reference_period: s.e.period || null,
      actual,
      forecast,
      previous,
      updated_at: new Date().toISOString(),
    }
  })

  // Upsert só das colunas de metadado: interpretação e título em PT, gravados
  // pela etapa de IA, não são tocados.
  const profileRows = [...profiles.values()]
  if (profileRows.length > 0) {
    const { error } = await supabaseAdmin.from('econ_event_profile').upsert(profileRows, { onConflict: 'event_key' })
    if (error) {
      console.error('[econ-calendar-sync] profile upsert', error)
      return fail(500, 'profile_upsert_failed')
    }
  }
  if (occurrenceRows.length > 0) {
    const { error } = await supabaseAdmin.from('econ_calendar_event').upsert(occurrenceRows, { onConflict: 'occurrence_id' })
    if (error) {
      console.error('[econ-calendar-sync] event upsert', error)
      return fail(500, 'event_upsert_failed')
    }
  }

  await supabaseAdmin.from('econ_calendar_sync')
    .update({ last_ok_at: new Date().toISOString(), last_error: null })
    .eq('id', 1)

  // ── 2. Interpretação dos indicadores que ainda não têm ──
  // Prioridade: próximos a acontecer (3★ antes de 2★, mais cedo primeiro),
  // depois os já passados (mais recentes primeiro).
  const ordered = [...selected].sort((a, b) => {
    const ta = Date.parse(a.e.date), tb = Date.parse(b.e.date)
    const fa = ta >= now ? 0 : 1, fb = tb >= now ? 0 : 1
    if (fa !== fb) return fa - fb
    if (a.importance !== b.importance) return b.importance - a.importance
    return fa === 0 ? ta - tb : tb - ta
  })
  const priority = [...new Set(ordered.map((s) => s.key))]
  const sampleByKey = new Map<string, TvEvent>()
  for (const s of ordered) if (!sampleByKey.has(s.key)) sampleByKey.set(s.key, s.e)

  let interpreted = 0
  if (priority.length > 0) {
    const retryCutoff = new Date(now - INTERPRET_RETRY_MS).toISOString()
    const { data: pending } = await supabaseAdmin
      .from('econ_event_profile')
      .select('event_key')
      .is('interpretation', null)
      .or(`interpreted_at.is.null,interpreted_at.lt.${retryCutoff}`)

    const pendingKeys = new Set((pending ?? []).map((p: { event_key: string }) => p.event_key))
    const batch = priority.filter((k) => pendingKeys.has(k)).slice(0, INTERPRET_BATCH)

    if (batch.length > 0) {
      const { data: aiConfig } = await supabaseAdmin.from('ai_configurations').select('*').maybeSingle()
      const system = 'Você é um economista e analista de mercado que explica o calendário econômico para traders de forma didática e objetiva. Responde sempre em JSON válido, em português do Brasil. Nunca recomenda compra ou venda nem promete resultado.'

      for (const key of batch) {
        if (Date.now() - startedAt > INTERPRET_BUDGET_MS) break
        const profile = profiles.get(key)!
        const result = await generateInterpretation(system, buildPrompt(profile, sampleByKey.get(key)), aiConfig || {})
        if (result) {
          await supabaseAdmin.from('econ_event_profile')
            .update({ interpretation: result, title_pt: result.titulo, interpreted_at: new Date().toISOString(), interpret_error: null })
            .eq('event_key', key)
          interpreted++
        } else {
          await supabaseAdmin.from('econ_event_profile')
            .update({ interpreted_at: new Date().toISOString(), interpret_error: 'ai_failed' })
            .eq('event_key', key)
        }
      }
    }
  }

  return jsonResponse(200, {
    ok: true,
    skipped: false,
    events: occurrenceRows.length,
    profiles: profileRows.length,
    interpreted,
  })
})
