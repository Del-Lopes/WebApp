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

// Maior que a duração máxima de uma execução (coleta + orçamento de IA +
// uma cascata em andamento): com 60s, uma execução ainda rodando perdia a
// trava e a seguinte interpretava os mesmos indicadores em duplicidade.
const MIN_INTERVAL_SECONDS = 150
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
const INTERPRET_BUDGET_MS = 60_000
// Nenhuma tentativa de IA começa depois deste prazo (a partir do início).
const HARD_DEADLINE_MS = 110_000
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
      signal: AbortSignal.timeout(15_000),
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
    // Chave no header, não na URL: erro de rede do Deno inclui a URL na mensagem.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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

// Modelos que falharam por erro permanente (400/403/404: modelo inexistente ou
// sem suporte a instrução de sistema / modo JSON) ou por cota (429) nesta
// execução. Pulados nos próximos eventos do lote, para não gastar o orçamento
// de tempo repetindo a mesma falha.
const deadModels = new Set<string>()
// Início da requisição corrente (zerado no handler junto com deadModels).
let requestStartedAt = Date.now()

// Tenta cada modelo até obter um JSON válido — um modelo que devolve JSON
// quebrado conta como falha e passa a vez ao próximo. Devolve também o motivo
// de cada falha, gravado em interpret_error para diagnóstico sem precisar dos
// logs da function.
async function generateInterpretation<T = Interpretation>(
  system: string, user: string, config: AIConfig, fallbackTitle: string,
  normalize: (raw: any, fallbackTitle: string) => T | null = normalizeInterpretation as any,
): Promise<{ result: T | null; errors: string[] }> {
  const attempts: Array<[string, () => Promise<string>]> = []
  const geminiKey = config.gemini_api_key || GEMINI_API_KEY
  if (geminiKey) {
    const models = [config.gemini_model || 'gemini-2.0-flash-lite', config.gemini_model_2, config.gemini_model_3].filter(Boolean) as string[]
    for (const m of models) attempts.push([m, () => callGemini(system, user, geminiKey, m)])
  }
  const groqKey = config.groq_api_key || GROQ_API_KEY
  const groqModel = config.groq_model || 'llama-3.3-70b-versatile'
  if (groqKey) attempts.push([groqModel, () => callGroq(system, user, groqKey, groqModel)])
  if (attempts.length === 0) return { result: null, errors: ['no_ai_keys'] }

  const errors: string[] = []
  for (const [label, attempt] of attempts) {
    if (deadModels.has(label)) continue
    if (Date.now() - requestStartedAt > HARD_DEADLINE_MS) { errors.push(`${label}: deadline`); break }
    try {
      const text = await attempt()
      let parsed: unknown
      try { parsed = JSON.parse(extractJson(text)) }
      catch { errors.push(`${label}: json_parse (${text.slice(0, 80)})`); continue }
      const result = normalize(Array.isArray(parsed) ? parsed[0] : parsed, fallbackTitle)
      if (result) return { result, errors }
      errors.push(`${label}: invalid_shape (${Object.keys((parsed as object) ?? {}).join(',').slice(0, 80)})`)
    } catch (e) {
      const msg = e instanceof Error ? (e.name === 'AbortError' ? 'timeout' : e.message) : String(e)
      if (/HTTP (400|403|404|429)/.test(msg)) deadModels.add(label)
      // Erro de rede do Deno traz a URL, e a do Gemini leva a chave na query.
      // A mensagem vai para a resposta e para uma coluna legível por usuários.
      errors.push(`${label}: ${msg.replace(/key=[^&\s)"']+/gi, 'key=***').slice(0, 160)}`)
    }
  }
  console.error('[econ-calendar-sync] ai failed', errors)
  return { result: null, errors }
}

// Tira cercas de markdown e texto em volta do objeto, caso o modelo ignore o
// modo JSON.
function extractJson(s: string): string {
  const t = s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const i = t.search(/[[{]/)
  const j = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'))
  return i >= 0 && j > i ? t.slice(i, j + 1) : t
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

function normalizeInterpretation(raw: any, fallbackTitle: string): Interpretation | null {
  if (!raw || typeof raw !== 'object') return null
  const tipo = raw.tipo === 'qualitativo' ? 'qualitativo' : 'dado'
  // Aceita as variações de nome mais comuns que os modelos devolvem.
  const c = raw.cenarios ?? raw.cenários ?? raw.scenarios ?? {}
  if (!c.em_linha) c.em_linha = c.emLinha ?? c['em linha'] ?? c.neutro
  const acima = normalizeScenario(c.acima, tipo === 'dado' ? 'Acima do esperado' : 'Tom mais duro (hawkish)')
  const abaixo = normalizeScenario(c.abaixo, tipo === 'dado' ? 'Abaixo do esperado' : 'Tom mais brando (dovish)')
  const emLinha = normalizeScenario(c.em_linha, tipo === 'dado' ? 'Em linha com o esperado' : 'Sem sinalização nova')
  // Sem título em PT não é motivo para descartar a análise inteira.
  const titulo = asStr(raw.titulo) || asStr(raw.título) || fallbackTitle
  const resumo = asStr(raw.resumo)
  const contexto = asStr(raw.contexto)
  if (!acima || !abaixo || !emLinha || !resumo || !contexto) return null
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

// ─── Interpretação por ativo ────────────────────────────────────────────────
// Lista fixa que o público acompanha. A ordem aqui é a ordem na tela.

const FOCUS_ASSETS = [
  { id: 'XAUUSD', nome: 'Ouro (XAU/USD)' },
  { id: 'NAS100', nome: 'Nasdaq 100 (NAS100)' },
  { id: 'US30', nome: 'Dow Jones (US30)' },
  { id: 'WIN', nome: 'Mini Índice (WIN, B3)' },
  { id: 'WDO', nome: 'Mini Dólar (WDO, B3)' },
  { id: 'BTC', nome: 'Bitcoin (BTC/USD)' },
] as const

type Relevancia = 'alta' | 'media' | 'baixa'
interface AssetReading {
  ativo: string
  relevancia: Relevancia
  acima: Dir
  em_linha: Dir
  abaixo: Dir
  leitura: string
}
interface AssetInterpretation { ativos: AssetReading[] }

const asRel = (v: unknown): Relevancia =>
  v === 'alta' ? 'alta' : v === 'baixa' ? 'baixa' : 'media'

// Exige os 6 ativos: sem um deles a leitura fica incompleta e é refeita.
function normalizeAssets(raw: any): AssetInterpretation | null {
  if (!raw || typeof raw !== 'object') return null
  const list: any[] = Array.isArray(raw.ativos) ? raw.ativos : Array.isArray(raw) ? raw : []
  const byId = new Map<string, any>()
  for (const a of list) {
    const id = asStr(a?.ativo).toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (id) byId.set(id, a)
  }
  const ativos: AssetReading[] = []
  for (const { id } of FOCUS_ASSETS) {
    const a = byId.get(id)
    const leitura = asStr(a?.leitura)
    if (!a || !leitura) return null
    const c = a.cenarios ?? a
    ativos.push({
      ativo: id,
      relevancia: asRel(a.relevancia),
      acima: asDir(c.acima),
      em_linha: asDir(c.em_linha ?? c.emLinha),
      abaixo: asDir(c.abaixo),
      leitura: leitura.slice(0, 400),
    })
  }
  return { ativos }
}

function buildAssetPrompt(p: ProfileRow, interp: Interpretation): string {
  const c = interp.cenarios
  const qualitative = interp.tipo === 'qualitativo'
  return `Indicador do calendário econômico:
- Nome: ${interp.titulo} (original: ${p.title})
- País: ${COUNTRY_PT[p.country] ?? p.country} · Moeda: ${p.currency}
- Importância: ${p.importance} estrelas (de 3)
- O que mede: ${interp.resumo}
- Contexto: ${interp.contexto}
- Cenários já definidos para ${p.currency}:
  - "acima" (${c.acima.rotulo}): ${p.currency} tende a ${c.acima.moeda} — ${c.acima.leitura}
  - "em_linha" (${c.em_linha.rotulo}): ${p.currency} tende a ${c.em_linha.moeda} — ${c.em_linha.leitura}
  - "abaixo" (${c.abaixo.rotulo}): ${p.currency} tende a ${c.abaixo.moeda} — ${c.abaixo.leitura}

Explique como cada um destes ativos costuma reagir a este indicador: ${FOCUS_ASSETS.map((a) => `${a.id} = ${a.nome}`).join('; ')}.

Devolva SOMENTE um JSON neste formato, com os 6 ativos nesta ordem:
{
  "ativos": [
    { "ativo": "XAUUSD", "relevancia": "alta|media|baixa", "acima": "alta|baixa|neutra", "em_linha": "alta|baixa|neutra", "abaixo": "alta|baixa|neutra", "leitura": "por que o ativo reage assim: o canal de transmissão (dólar, juros/Treasuries, apetite a risco, fluxo para emergentes) em 1-2 frases" },
    ...
  ]
}

Regras:
- As direções precisam ser coerentes com os cenários de ${p.currency} acima${qualitative ? ' (acima = tom mais duro/hawkish, abaixo = tom mais brando/dovish)' : ''}. Ex.: USD em alta com juros mais altos → Ouro tende a baixa, NAS100 tende a baixa, WDO tende a alta.
- WIN e WDO são contratos da B3: pense no efeito via dólar/real, juros e apetite a risco global. WDO acompanha o USD/BRL.
- "relevancia" = quanto o ativo costuma se mexer com este indicador. Indicador de país/moeda sem ligação direta com o ativo → "baixa" e direções "neutra" quando não houver efeito típico.
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
  // Estado por requisição: um 429 de uma execução anterior não deve marcar o
  // modelo como morto para sempre no isolate reaproveitado.
  deadModels.clear()
  requestStartedAt = startedAt

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
  let assetsInterpreted = 0
  let firstAiError: string | null = null
  const retryCutoff = new Date(now - INTERPRET_RETRY_MS).toISOString()
  const system = 'Você é um economista e analista de mercado que explica o calendário econômico para traders de forma didática e objetiva. Responde sempre em JSON válido, em português do Brasil. Nunca recomenda compra ou venda nem promete resultado.'
  let aiConfig: AIConfig | null | undefined
  const getAiConfig = async (): Promise<AIConfig> => {
    if (aiConfig === undefined) {
      const { data } = await supabaseAdmin.from('ai_configurations').select('*').maybeSingle()
      aiConfig = data
    }
    return aiConfig || {}
  }

  if (priority.length > 0) {
    const { data: pending } = await supabaseAdmin
      .from('econ_event_profile')
      .select('event_key')
      .is('interpretation', null)
      .or(`interpreted_at.is.null,interpreted_at.lt.${retryCutoff}`)

    const pendingKeys = new Set((pending ?? []).map((p: { event_key: string }) => p.event_key))
    const batch = priority.filter((k) => pendingKeys.has(k)).slice(0, INTERPRET_BATCH)

    if (batch.length > 0) {
      const config = await getAiConfig()
      for (const key of batch) {
        if (Date.now() - startedAt > INTERPRET_BUDGET_MS) break
        const profile = profiles.get(key)!
        const { result, errors } = await generateInterpretation(system, buildPrompt(profile, sampleByKey.get(key)), config, profile.title)
        if (result) {
          // Título em PT só quando a IA deu um (o fallback é o próprio título em inglês).
          const titlePt = result.titulo !== profile.title ? result.titulo : null
          await supabaseAdmin.from('econ_event_profile')
            .update({ interpretation: result, title_pt: titlePt, interpreted_at: new Date().toISOString(), interpret_error: null })
            .eq('event_key', key)
          interpreted++
        } else {
          await supabaseAdmin.from('econ_event_profile')
            .update({ interpreted_at: new Date().toISOString(), interpret_error: errors.join(' | ').slice(0, 500) })
            .eq('event_key', key)
          if (!firstAiError) firstAiError = errors[0] ?? null
        }
      }
    }

    // Interpretação por ativo: só para indicadores que já têm a interpretação
    // principal (as direções por ativo derivam dos cenários da moeda). Sem a
    // migration 20260929 a consulta falha e a etapa é pulada.
    if (Date.now() - startedAt < INTERPRET_BUDGET_MS) {
      const { data: pendingAssets, error: paErr } = await supabaseAdmin
        .from('econ_event_profile')
        .select('event_key, interpretation')
        .not('interpretation', 'is', null)
        .is('asset_interpretation', null)
        .or(`assets_interpreted_at.is.null,assets_interpreted_at.lt.${retryCutoff}`)
      if (paErr) {
        console.warn('[econ-calendar-sync] assets skip', paErr.message)
      } else {
        const interpByKey = new Map<string, Interpretation>(
          (pendingAssets ?? []).map((p: { event_key: string; interpretation: Interpretation }) => [p.event_key, p.interpretation]),
        )
        const assetBatch = priority.filter((k) => interpByKey.has(k)).slice(0, INTERPRET_BATCH)
        const config = assetBatch.length > 0 ? await getAiConfig() : {}
        for (const key of assetBatch) {
          if (Date.now() - startedAt > INTERPRET_BUDGET_MS) break
          const profile = profiles.get(key)!
          const { result, errors } = await generateInterpretation<AssetInterpretation>(
            system, buildAssetPrompt(profile, interpByKey.get(key)!), config, profile.title, normalizeAssets,
          )
          await supabaseAdmin.from('econ_event_profile')
            .update(result
              ? { asset_interpretation: result, assets_interpreted_at: new Date().toISOString(), assets_error: null }
              : { assets_interpreted_at: new Date().toISOString(), assets_error: errors.join(' | ').slice(0, 500) })
            .eq('event_key', key)
          if (result) assetsInterpreted++
          else if (!firstAiError) firstAiError = errors[0] ?? null
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
    assets_interpreted: assetsInterpreted,
    // Só o motivo (ex.: "gemini-2.0-flash-lite: Gemini HTTP 429"), nunca chave.
    ...(firstAiError ? { ai_error: firstAiError } : {}),
  })
})
