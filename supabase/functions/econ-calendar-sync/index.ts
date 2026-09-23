// Supabase Edge Function — econ-calendar-sync
//
// Coleta o calendário econômico do Investing.com (apenas 2 e 3 estrelas, em
// PT-BR) e interpreta cada indicador com IA.
//
//   POST|GET /functions/v1/econ-calendar-sync
//     → { ok: true, skipped: boolean, events?: n, profiles?: n, interpreted?: n }
//
// Fonte: endpoint JSON que o próprio site do Investing usa para montar o
// calendário (endpoints.investing.com). Não é API pública documentada — se o
// formato mudar ou o Cloudflare passar a bloquear, o sync falha e o app continua
// mostrando o que já está no banco. O erro fica em econ_calendar_sync.last_error.
// O Cloudflare bloqueia chamadas com Origin de terceiros, por isso a coleta é
// server-side e não no browser.
//
// Interpretação: uma por INDICADOR (event_id), não por divulgação — o CPI de
// setembro e o de outubro têm a mesma leitura de cenários. Gerada uma vez, em
// lotes pequenos por execução, e reaproveitada por todos os usuários. A
// polaridade observada no Investing (acima da projeção = positivo ou negativo
// para a moeda) entra no prompt como verdade de referência.
//
// Frequência: trava global de 60s (RPC econ_calendar_claim_sync). O cron chama a
// cada 5 min e o app chama ao abrir a sessão; chamadas dentro da janela são no-op.
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
const INTERPRET_BATCH = 5
// Orçamento de tempo para a IA — a coleta já aconteceu, o resto fica para a
// próxima execução.
const INTERPRET_BUDGET_MS = 90_000
// Falhou ao interpretar? Tenta de novo depois disso, para não queimar cota em loop.
const INTERPRET_RETRY_MS = 6 * 3600_000

// ─── Investing.com ───────────────────────────────────────────────────────────

const INV_BASE = 'https://endpoints.investing.com/pd-instruments/v1/calendars/economic/events/occurrences'
// domain_id 30 = br.investing.com → títulos e descrições em português.
const INV_DOMAIN_PT = '30'

interface InvEvent {
  event_id: number
  country_id?: number
  currency: string
  category?: string
  event_type?: string
  importance: 'low' | 'medium' | 'high'
  event_translated?: string
  long_name?: string
  short_name?: string
  description?: string
  source?: string
  source_url?: string
  page_link?: string
}

interface InvOccurrence {
  occurrence_id: number
  event_id: number
  occurrence_time: string
  unit?: string
  precision?: number
  reference_period?: string
  preliminary?: boolean
  actual?: number
  forecast?: number
  previous?: number
  actual_to_forecast?: string
  revised_to_previous?: string
}

async function fetchInvesting(start: Date, end: Date): Promise<{ events: InvEvent[]; occurrences: InvOccurrence[] }> {
  const events: InvEvent[] = []
  const occurrences: InvOccurrence[] = []
  let cursor: string | null = null

  // Paginação por cursor. Com limit=500 uma janela de ~10 dias cabe numa página;
  // o teto de páginas protege contra cursor que não avança.
  for (let page = 0; page < 10; page++) {
    const url = new URL(INV_BASE)
    url.searchParams.set('domain_id', INV_DOMAIN_PT)
    url.searchParams.set('limit', '500')
    url.searchParams.set('start_date', start.toISOString())
    url.searchParams.set('end_date', end.toISOString())
    // 2 e 3 estrelas. O parâmetro não é "explodido": vai separado por vírgula.
    url.searchParams.set('importance', 'medium,high')
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url.toString(), {
      headers: {
        // Sem User-Agent de navegador o Cloudflare responde 403.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://br.investing.com',
        'Referer': 'https://br.investing.com/',
      },
    })
    if (!res.ok) throw new Error(`investing_http_${res.status}`)
    const json = await res.json()
    if (!Array.isArray(json?.occurrences)) throw new Error('investing_bad_payload')

    events.push(...(json.events ?? []))
    occurrences.push(...json.occurrences)
    cursor = json.next_page_cursor ?? null
    if (!cursor) break
  }

  return { events, occurrences }
}

// A descrição vem com HTML escapado (&lt;BR/&gt;) e quebras \r\n. Às vezes a
// entidade vem sem o ";" (<BR/&gt), por isso o ";" opcional.
function cleanDescription(raw: string | undefined): string | null {
  if (!raw) return null
  const text = raw
    .replace(/&lt;?/gi, '<').replace(/&gt;?/gi, '>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&nbsp;/gi, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text || null
}

const importanceStars = (i: string) => (i === 'high' ? 3 : 2)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

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
  const resumo = asStr(raw.resumo)
  const contexto = asStr(raw.contexto)
  if (!acima || !abaixo || !emLinha || !resumo || !contexto) return null
  return { tipo, resumo, contexto, cenarios: { acima, abaixo, em_linha: emLinha }, atencao: asStr(raw.atencao) }
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

function buildPrompt(p: ProfileRow, sample: InvOccurrence | undefined): string {
  const assets = ASSETS_BY_CURRENCY[p.currency] ?? `pares com ${p.currency}, índice de ações local`
  const qualitative = p.event_type === 'speech' || p.event_type === 'report'
  const polarityLine = p.polarity === 1
    ? `Referência observada no Investing: leitura ACIMA da projeção é classificada como POSITIVA para ${p.currency}. Respeite isso.`
    : p.polarity === -1
      ? `Referência observada no Investing: leitura ACIMA da projeção é classificada como NEGATIVA para ${p.currency} (ex.: desemprego, estoques). Respeite isso.`
      : ''
  const sampleLine = sample && (sample.previous != null || sample.forecast != null)
    ? `Última divulgação conhecida: anterior ${sample.previous ?? '—'}${sample.unit ?? ''}, projeção ${sample.forecast ?? '—'}${sample.unit ?? ''}.`
    : ''

  return `Indicador do calendário econômico:
- Nome: ${p.title}
- Moeda/país: ${p.currency}
- Categoria: ${p.category ?? '—'}
- Importância: ${p.importance} estrelas (de 3)
- Tipo: ${qualitative ? 'qualitativo (discurso, ata ou relatório — sem número a comparar)' : 'dado numérico (atual × projeção × anterior)'}
- Descrição da fonte: ${p.description ?? '—'}
${polarityLine}
${sampleLine}

Ativos relevantes para o público (trader brasileiro que opera forex, índices e B3): ${assets}

Escreva a interpretação deste indicador para um trader. Devolva SOMENTE um JSON neste formato:
{
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
- "intensidade" reflete o peso do indicador (3 estrelas com surpresa grande tende a "forte"; 2 estrelas tende a "moderada"; em linha tende a "fraca").
- Em "ativos", 3 a 5 itens da lista de ativos relevantes, com a direção coerente com a moeda (ex.: USD em alta → EUR/USD em baixa, WDO em alta).
- Linguagem de probabilidade ("tende a", "costuma"), nunca certeza. Não recomende compra ou venda.
- Português do Brasil, sem markdown.`
}

// ─── Handler ─────────────────────────────────────────────────────────────────

interface ProfileRow {
  event_id: number
  title: string
  currency: string
  category: string | null
  event_type: string | null
  importance: number
  description: string | null
  polarity: number | null
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

  // ── 1. Coleta ──
  const { count: existing } = await supabaseAdmin
    .from('econ_calendar_event')
    .select('occurrence_id', { count: 'exact', head: true })

  const now = Date.now()
  const pastDays = (existing ?? 0) === 0 ? BACKFILL_DAYS : WINDOW_PAST_DAYS
  const start = new Date(now - pastDays * 86_400_000)
  const end = new Date(now + WINDOW_FUTURE_DAYS * 86_400_000)

  let events: InvEvent[], occurrences: InvOccurrence[]
  try {
    ({ events, occurrences } = await fetchInvesting(start, end))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[econ-calendar-sync] fetch failed', msg)
    await supabaseAdmin.from('econ_calendar_sync').update({ last_error: msg }).eq('id', 1)
    return jsonResponse(502, { error: 'source_fetch_failed', detail: msg })
  }

  const eventById = new Map<number, InvEvent>()
  for (const ev of events) {
    if (ev?.event_id && (ev.importance === 'medium' || ev.importance === 'high')) eventById.set(ev.event_id, ev)
  }

  // Polaridade: quando o dado sai diferente da projeção, o Investing marca a
  // leitura como positiva/negativa para a moeda. Daí sai se "acima" é bom ou
  // ruim para aquele indicador (desemprego e estoques, por exemplo, são
  // invertidos).
  const polarity = new Map<number, number>()
  for (const o of occurrences) {
    const a = num(o.actual), f = num(o.forecast)
    if (a == null || f == null || a === f) continue
    if (o.actual_to_forecast !== 'positive' && o.actual_to_forecast !== 'negative') continue
    polarity.set(o.event_id, Math.sign(a - f) * (o.actual_to_forecast === 'positive' ? 1 : -1))
  }

  const profileRows = [...eventById.values()].map((ev) => ({
    event_id: ev.event_id,
    title: ev.event_translated || ev.long_name || ev.short_name || `Evento ${ev.event_id}`,
    currency: ev.currency || '—',
    country_id: ev.country_id ?? null,
    category: ev.category ?? null,
    event_type: ev.event_type ?? null,
    importance: importanceStars(ev.importance),
    description: cleanDescription(ev.description),
    source: ev.source ?? null,
    source_url: ev.source_url ?? null,
    page_link: ev.page_link ?? null,
    updated_at: new Date().toISOString(),
  }))

  const occurrenceRows = occurrences
    .filter((o) => o?.occurrence_id && eventById.has(o.event_id))
    .map((o) => {
      const ev = eventById.get(o.event_id)!
      return {
        occurrence_id: o.occurrence_id,
        event_id: o.event_id,
        occurs_at: o.occurrence_time,
        currency: ev.currency || '—',
        title: ev.event_translated || ev.long_name || ev.short_name || `Evento ${ev.event_id}`,
        importance: importanceStars(ev.importance),
        unit: o.unit ?? null,
        precision: typeof o.precision === 'number' ? o.precision : null,
        reference_period: o.reference_period ?? null,
        preliminary: !!o.preliminary,
        actual: num(o.actual),
        forecast: num(o.forecast),
        previous: num(o.previous),
        actual_to_forecast: o.actual_to_forecast ?? null,
        revised_to_previous: o.revised_to_previous ?? null,
        updated_at: new Date().toISOString(),
      }
    })

  // Dois lotes com colunas homogêneas: quem tem polaridade observada nesta
  // janela grava a coluna; quem não tem fica fora dela, para o upsert não
  // sobrescrever com null uma polaridade aprendida em execuções anteriores.
  const withPolarity = profileRows.filter((r) => polarity.has(r.event_id)).map((r) => ({ ...r, polarity: polarity.get(r.event_id)! }))
  const withoutPolarity = profileRows.filter((r) => !polarity.has(r.event_id))
  for (const rows of [withPolarity, withoutPolarity]) {
    if (rows.length === 0) continue
    const { error } = await supabaseAdmin.from('econ_event_profile').upsert(rows, { onConflict: 'event_id' })
    if (error) {
      console.error('[econ-calendar-sync] profile upsert', error)
      await supabaseAdmin.from('econ_calendar_sync').update({ last_error: 'profile_upsert_failed' }).eq('id', 1)
      return jsonResponse(500, { error: 'profile_upsert_failed' })
    }
  }
  if (occurrenceRows.length > 0) {
    const { error } = await supabaseAdmin.from('econ_calendar_event').upsert(occurrenceRows, { onConflict: 'occurrence_id' })
    if (error) {
      console.error('[econ-calendar-sync] event upsert', error)
      await supabaseAdmin.from('econ_calendar_sync').update({ last_error: 'event_upsert_failed' }).eq('id', 1)
      return jsonResponse(500, { error: 'event_upsert_failed' })
    }
  }

  await supabaseAdmin.from('econ_calendar_sync')
    .update({ last_ok_at: new Date().toISOString(), last_error: null })
    .eq('id', 1)

  // ── 2. Interpretação dos indicadores que ainda não têm ──
  // Prioridade: próximos a acontecer (mais cedo primeiro, 3★ antes de 2★),
  // depois os já passados.
  const ordered = [...occurrences]
    .filter((o) => eventById.has(o.event_id))
    .sort((a, b) => {
      const ta = Date.parse(a.occurrence_time), tb = Date.parse(b.occurrence_time)
      const fa = ta >= now ? 0 : 1, fb = tb >= now ? 0 : 1
      if (fa !== fb) return fa - fb
      const ia = importanceStars(eventById.get(a.event_id)!.importance)
      const ib = importanceStars(eventById.get(b.event_id)!.importance)
      if (ia !== ib) return ib - ia
      return fa === 0 ? ta - tb : tb - ta
    })
  const priority = [...new Set(ordered.map((o) => o.event_id))]
  const sampleByEvent = new Map<number, InvOccurrence>()
  for (const o of ordered) if (!sampleByEvent.has(o.event_id)) sampleByEvent.set(o.event_id, o)

  let interpreted = 0
  if (priority.length > 0) {
    const retryCutoff = new Date(now - INTERPRET_RETRY_MS).toISOString()
    const { data: pending } = await supabaseAdmin
      .from('econ_event_profile')
      .select('event_id, title, currency, category, event_type, importance, description, polarity')
      .in('event_id', priority)
      .is('interpretation', null)
      .or(`interpreted_at.is.null,interpreted_at.lt.${retryCutoff}`)

    const pendingById = new Map<number, ProfileRow>((pending ?? []).map((p: ProfileRow) => [p.event_id, p]))
    const batch = priority.filter((id) => pendingById.has(id)).slice(0, INTERPRET_BATCH)

    if (batch.length > 0) {
      const { data: aiConfig } = await supabaseAdmin.from('ai_configurations').select('*').maybeSingle()
      const system = 'Você é um economista e analista de mercado que explica o calendário econômico para traders de forma didática e objetiva. Responde sempre em JSON válido, em português do Brasil. Nunca recomenda compra ou venda nem promete resultado.'

      for (const eventId of batch) {
        if (Date.now() - startedAt > INTERPRET_BUDGET_MS) break
        const profile = pendingById.get(eventId)!
        const result = await generateInterpretation(system, buildPrompt(profile, sampleByEvent.get(eventId)), aiConfig || {})
        if (result) {
          await supabaseAdmin.from('econ_event_profile')
            .update({ interpretation: result, interpreted_at: new Date().toISOString(), interpret_error: null })
            .eq('event_id', eventId)
          interpreted++
        } else {
          await supabaseAdmin.from('econ_event_profile')
            .update({ interpreted_at: new Date().toISOString(), interpret_error: 'ai_failed' })
            .eq('event_id', eventId)
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
