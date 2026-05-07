// Supabase Edge Function — chat-assistant
// Bot de suporte da plataforma Trader AFK via Gemini
// Deno runtime — fetch() only, no Node SDKs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

// Service role client — usado para escrever em chat_usage e ler com privilégios
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─── Configuração do rate limit ───────────────────────────────────────────────

const DAILY_MESSAGE_LIMIT = 30
const HALF_LIMIT_THRESHOLD = 15
const HISTORY_TURNS = 10 // últimas 10 mensagens enviadas como contexto

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ChatRequest {
  message: string
}

interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

// ─── System prompt restritivo ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o Assistente de Suporte da plataforma Trader AFK, uma plataforma de trading algorítmico para membros.

ESCOPO ESTRITO — você responde APENAS sobre:
- Como usar a plataforma Trader AFK (navegação, telas, recursos)
- Ativação e gestão de licenças dos robôs
- Como instalar, configurar e usar os robôs disponíveis na plataforma
- Dúvidas sobre a área de Educação, Artigos, Estratégias, Marketing, Downloads e demais seções
- Jornada do usuário e onboarding
- Configurações de conta e perfil
- Problemas operacionais e de acesso à plataforma

VOCÊ NÃO RESPONDE (recuse educadamente e redirecione para o escopo):
- Conselhos sobre mercado financeiro, ativos, ações, criptomoedas, forex
- Recomendações de compra/venda ou estratégias de trading personalizadas
- Análises técnicas ou previsões de mercado
- Questões fiscais, jurídicas ou contábeis
- Qualquer assunto não relacionado à plataforma Trader AFK
- Programação genérica, matemática, ciência, política, etc.

REGRAS DE RESPOSTA:
- Sempre em Português Brasileiro (pt-BR)
- Tom cordial, direto e objetivo
- Máximo 4 parágrafos curtos por resposta
- Se não souber a resposta exata sobre a plataforma, oriente o usuário a contatar o suporte humano
- Quando recusar uma pergunta fora de escopo, seja breve e educado: "Sou o assistente de suporte da plataforma Trader AFK e respondo apenas sobre o uso da plataforma. Posso te ajudar com [sugestão de tópicos do escopo]."`

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getUserFromAuth(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id }
}

// ─── Rate limit helpers ───────────────────────────────────────────────────────

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

async function getUsageCount(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('chat_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('usage_date', todayUtc())
    .maybeSingle()
  if (error) {
    console.error('getUsageCount error:', error.message)
    return 0
  }
  return data?.message_count ?? 0
}

async function incrementUsage(userId: string): Promise<number> {
  const date = todayUtc()
  const current = await getUsageCount(userId)
  const next = current + 1
  const { error } = await supabaseAdmin
    .from('chat_usage')
    .upsert(
      { user_id: userId, usage_date: date, message_count: next },
      { onConflict: 'user_id,usage_date' },
    )
  if (error) {
    console.error('incrementUsage error:', error.message)
  }
  return next
}

// ─── Histórico ────────────────────────────────────────────────────────────────

async function loadHistory(userId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_TURNS)
  if (error) {
    console.error('loadHistory error:', error.message)
    return []
  }
  return (data ?? []).reverse() as HistoryEntry[]
}

async function saveMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('chat_messages')
    .insert({ user_id: userId, role, content })
  if (error) console.error('saveMessage error:', error.message)
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function callGemini(systemPrompt: string, history: HistoryEntry[], userMessage: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada')

  const modelName = 'gemini-1.5-flash'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  // Gemini espera roles 'user' e 'model' (não 'assistant')
  const contents = [
    ...history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
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

// ─── Handler ──────────────────────────────────────────────────────────────────

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // 1. Autenticação
  const user = await getUserFromAuth(req)
  if (!user) {
    return jsonResponse({ error: 'Não autorizado' }, 401)
  }

  // 2. Parse body
  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400)
  }

  const message = (body.message ?? '').trim()
  if (!message) {
    return jsonResponse({ error: 'Mensagem vazia' }, 400)
  }
  if (message.length > 2000) {
    return jsonResponse({ error: 'Mensagem muito longa (máx. 2000 caracteres)' }, 400)
  }

  // 3. Rate limit — verifica antes de chamar Gemini
  const currentCount = await getUsageCount(user.id)
  if (currentCount >= DAILY_MESSAGE_LIMIT) {
    return jsonResponse({
      error: 'limit_reached',
      message: `Você atingiu o limite diário de ${DAILY_MESSAGE_LIMIT} mensagens. Volte amanhã para continuar conversando.`,
      usage: { count: currentCount, limit: DAILY_MESSAGE_LIMIT, warn_half: false },
    }, 429)
  }

  try {
    // 4. Carrega histórico recente
    const history = await loadHistory(user.id)

    // 5. Salva mensagem do usuário
    await saveMessage(user.id, 'user', message)

    // 6. Chama Gemini
    const reply = await callGemini(SYSTEM_PROMPT, history, message)

    // 7. Salva resposta + incrementa contador
    await saveMessage(user.id, 'assistant', reply)
    const newCount = await incrementUsage(user.id)

    // 8. Avisa quando atingir 50% (15 mensagens)
    const warnHalf = newCount === HALF_LIMIT_THRESHOLD

    return jsonResponse({
      reply,
      usage: { count: newCount, limit: DAILY_MESSAGE_LIMIT, warn_half: warnHalf },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('chat-assistant error:', msg)
    return jsonResponse({ error: 'Falha ao processar a mensagem. Tente novamente em instantes.' }, 500)
  }
})
