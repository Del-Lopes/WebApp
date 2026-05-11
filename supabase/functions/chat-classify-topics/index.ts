// Supabase Edge Function — chat-classify-topics
// Classifica mensagens de usuários em tópicos via Gemini para o painel admin
// Deno runtime — fetch() only, no Node SDKs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const MAX_SAMPLE_MESSAGES = 200

interface ClassifyRequest {
  period_days?: number
}

interface TopicResult {
  topic: string
  description: string
  message_count: number
  user_count: number
  sample_messages: string[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getUserAndRole(req: Request): Promise<{ id: string; role: string | null } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()
  return { id: data.user.id, role: profile?.role ?? null }
}

async function callGeminiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada')
  const modelName = 'gemini-3.1-flash-lite-preview'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      },
    )
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Resposta vazia do Gemini')
    return text.trim()
  } finally {
    clearTimeout(timeout)
  }
}

function parseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    throw new Error('Não foi possível extrair JSON da resposta da IA')
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // 1. Auth + autorização (admin ou first_mate)
  const ctx = await getUserAndRole(req)
  if (!ctx) return jsonResponse({ error: 'Não autorizado' }, 401)
  if (ctx.role !== 'admin' && ctx.role !== 'first_mate') {
    return jsonResponse({ error: 'Acesso negado' }, 403)
  }

  // 2. Parse body
  let body: ClassifyRequest = {}
  try {
    body = await req.json()
  } catch { /* body opcional */ }
  const periodDays = Math.max(1, Math.min(90, Number(body.period_days) || 7))

  try {
    // 3. Carrega mensagens dos usuários no período
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('chat_messages')
      .select('user_id, content, created_at')
      .eq('role', 'user')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_SAMPLE_MESSAGES)

    if (msgError) throw new Error(`Falha ao ler mensagens: ${msgError.message}`)
    if (!messages || messages.length === 0) {
      // Limpa resumos antigos (vamos sobrescrever com vazio) e retorna
      await supabaseAdmin.from('chat_topic_summaries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      return jsonResponse({ ok: true, topics: [], total_messages: 0, period_days: periodDays })
    }

    // 4. Monta prompt e chama Gemini
    const systemPrompt = `Você é um analista de suporte da plataforma Trader AFK. Sua tarefa é categorizar mensagens de usuários em até 6 tópicos representativos do que eles mais perguntam ou têm dúvidas. Tópicos sugeridos (use os que se aplicam, crie outros se necessário): "Licenças", "Robôs e instalação", "Educação e cursos", "Jornada do usuário", "Configurações de conta", "Pagamentos e Assinaturas", "Marketing e Indicações", "Outros".

Retorne APENAS um array JSON válido, sem markdown, no formato:
[
  {
    "topic": "string curta — nome do tópico",
    "description": "1 frase explicando o que os usuários estão perguntando nesse tópico",
    "message_count": número de mensagens classificadas nesse tópico,
    "user_count": número de usuários distintos que perguntaram sobre isso,
    "sample_messages": ["mensagem original 1", "mensagem original 2", "mensagem original 3"]
  }
]

Regras:
- Cite até 3 mensagens originais (não invente — use textuais)
- Ordene do tópico mais frequente para o menos frequente
- Se houver poucas mensagens (< 5), pode retornar 1 ou 2 tópicos genéricos
- Mensagens iguais ou quase iguais devem ser agrupadas no mesmo tópico
- Conte usuários distintos pelo identificador entre colchetes [u1], [u2], etc no input.`

    const compactInput = messages
      .map((m, i) => {
        const userTag = `[u${(messages.findIndex((x) => x.user_id === m.user_id) + 1)}]`
        return `${i + 1}. ${userTag} ${m.content.slice(0, 300).replace(/\s+/g, ' ').trim()}`
      })
      .join('\n')

    const userPrompt = `Período analisado: últimos ${periodDays} dias\nTotal de mensagens: ${messages.length}\n\nMensagens dos usuários (cada uma marcada com [uN] = identificador único do usuário):\n\n${compactInput}`

    const raw = await callGeminiJson(systemPrompt, userPrompt)
    const parsed = parseJson(raw)
    const topicsArr = Array.isArray(parsed) ? parsed : (parsed as { topics?: unknown }).topics
    if (!Array.isArray(topicsArr)) throw new Error('IA não retornou array de tópicos')

    const topics: TopicResult[] = topicsArr
      .filter((t): t is TopicResult =>
        typeof t === 'object' && t !== null
        && typeof (t as TopicResult).topic === 'string'
        && (t as TopicResult).topic.trim().length > 0,
      )
      .map((t) => ({
        topic: String(t.topic).slice(0, 100),
        description: String(t.description ?? '').slice(0, 500),
        message_count: Number(t.message_count) || 0,
        user_count: Number(t.user_count) || 0,
        sample_messages: Array.isArray(t.sample_messages)
          ? t.sample_messages.slice(0, 5).map((s) => String(s).slice(0, 400))
          : [],
      }))

    // 5. Substitui os resumos antigos pelos novos
    await supabaseAdmin.from('chat_topic_summaries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (topics.length > 0) {
      const rows = topics.map((t) => ({ ...t, period_days: periodDays }))
      const { error: insertError } = await supabaseAdmin.from('chat_topic_summaries').insert(rows)
      if (insertError) throw new Error(`Falha ao salvar tópicos: ${insertError.message}`)
    }

    return jsonResponse({
      ok: true,
      topics,
      total_messages: messages.length,
      period_days: periodDays,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('chat-classify-topics error:', msg)
    return jsonResponse({ error: 'Falha ao classificar tópicos.', detail: msg }, 500)
  }
})
