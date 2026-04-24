// Supabase Edge Function — generate-articles (semi-manual, URL-based)
// Deno runtime — fetch() only, no Node SDKs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  source_url: string
  writer_persona?: string
  default_category?: string
}

interface ArticlePayload {
  title: string
  content: string
  excerpt: string
}

// ─── HTML scraping ────────────────────────────────────────────────────────────

interface ScrapedPage {
  text: string
  images: string[]
}

async function scrapePage(url: string): Promise<ScrapedPage> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TradexBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch URL: HTTP ${res.status}`)

  const html = await res.text()

  // Extract visible text: strip tags, collapse whitespace
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 12000) // cap context to keep tokens lean

  // Extract <img src> and <meta og:image> URLs
  const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)

  const rawImages = [
    ogMatch?.[1],
    ...imgMatches.map((m) => m[1]),
  ]
    .filter(Boolean)
    .map((src) => {
      try {
        return new URL(src as string, url).href
      } catch {
        return null
      }
    })
    .filter((src): src is string => !!src && (src.startsWith('http://') || src.startsWith('https://')))
    // Skip tiny icons/tracking pixels (heuristic: skip URLs with "pixel", "icon", "logo", "avatar", "1x1", "spacer")
    .filter((src) => !/pixel|icon|logo|avatar|1x1|spacer|sprite/i.test(src))
    .slice(0, 6)

  return { text, images: rawImages }
}

// ─── AI providers ─────────────────────────────────────────────────────────────

function buildSystemPrompt(persona: string): string {
  return `Você é ${persona}.
Sua tarefa é criar um artigo educacional em Português Brasileiro (pt-BR) para uma plataforma exclusiva de membros focada em trading algorítmico.
O artigo deve ser prático, com linguagem acessível para traders intermediários, e baseado no conteúdo de referência fornecido.
Retorne APENAS um objeto JSON válido — sem markdown, sem texto extra.`
}

function buildArticlePrompt(sourceText: string, category: string, sourceUrl: string): string {
  return `Use o seguinte conteúdo de referência (extraído de ${sourceUrl}) como base para criar um novo artigo educacional em Português Brasileiro:

---CONTEÚDO DE REFERÊNCIA---
${sourceText}
---FIM DO CONTEÚDO---

Crie um artigo adaptado e aprimorado em pt-BR para traders. Não copie o texto original — reescreva com suas próprias palavras, acrescente clareza e exemplos práticos.

Retorne JSON com EXATAMENTE estes campos:
{
  "title": "título do artigo (máximo 80 caracteres)",
  "content": "artigo completo em HTML semântico: use <h2>, <h3>, <p>, <ul>/<ol>. Mínimo 600 palavras. Sem tags <html>/<body>/<script>.",
  "excerpt": "resumo em uma frase (máximo 160 caracteres)",
  "category": "${category}"
}`
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.6 },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Empty Gemini response')
  return text
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    }),
  })
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('Empty Groq response')
  return text
}

async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; model: string }> {
  if (GEMINI_API_KEY) {
    try {
      return { text: await callGemini(systemPrompt, userPrompt), model: 'gemini-2.0-flash-lite' }
    } catch (e) {
      console.error('Gemini failed:', e instanceof Error ? e.message : JSON.stringify(e))
    }
  } else {
    console.warn('GEMINI_API_KEY not set — skipping Gemini')
  }
  if (GROQ_API_KEY) {
    try {
      return { text: await callGroq(systemPrompt, userPrompt), model: 'groq/llama-3.3-70b-versatile' }
    } catch (e) {
      console.error('Groq failed:', e)
    }
  }
  throw new Error('All AI providers failed — check GEMINI_API_KEY or GROQ_API_KEY')
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

function parseAIJson(raw: string): unknown {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('No JSON found in AI response')
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body: GenerateRequest = await req.json()

    if (!body.source_url) {
      return json({ error: 'source_url is required' }, 400)
    }

    // Validate URL format
    try { new URL(body.source_url) } catch {
      return json({ error: 'source_url is not a valid URL' }, 400)
    }

    const persona = body.writer_persona
      ?? 'um educador especialista em trading algorítmico, programação MQL5, análise técnica e gestão de risco para traders de varejo'
    const category = body.default_category ?? 'Análise Geral'

    // 1. Scrape source page
    const { text: sourceText, images: sourceImages } = await scrapePage(body.source_url)

    if (sourceText.length < 200) {
      return json({ error: 'Source page returned too little text to generate an article' }, 422)
    }

    // 2. Generate article via AI
    const systemPrompt = buildSystemPrompt(persona)
    const userPrompt = buildArticlePrompt(sourceText, category, body.source_url)

    const { text: rawAI, model: modelUsed } = await generateText(systemPrompt, userPrompt)
    const parsed = parseAIJson(rawAI) as ArticlePayload

    if (!parsed.title || !parsed.content) {
      throw new Error('AI response missing title or content')
    }

    // 3. Use images extracted directly from source page (first one = cover)
    const coverImageUrl = sourceImages[0] ?? null
    const galleryUrls = sourceImages.slice(1)

    // 4. Insert article
    const { data: articleData, error: insertError } = await supabase
      .from('articles')
      .insert({
        title: parsed.title,
        content: parsed.content,
        excerpt: parsed.excerpt ?? '',
        category,
        image_url: coverImageUrl,
        gallery_urls: galleryUrls,
        author: 'IA Tradexperience',
        ai_generated: true,
      })
      .select('id')
      .single()

    if (insertError) throw new Error(`DB insert failed: ${insertError.message ?? JSON.stringify(insertError)}`)

    // 5. Log execution
    await supabase.from('article_automation_logs').insert({
      article_id: articleData?.id ?? null,
      topic: body.source_url,
      model_used: modelUsed,
      status: 'success',
    })

    return json({
      ok: true,
      article_id: articleData?.id,
      title: parsed.title,
      model: modelUsed,
      images_found: sourceImages.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error
      ? err.message
      : (typeof err === 'object' && err !== null && 'message' in err)
        ? String((err as { message: unknown }).message)
        : JSON.stringify(err)
    console.error('generate-articles error:', msg)

    // Best-effort error log (source_url may not exist if body parse failed)
    try {
      await supabase.from('article_automation_logs').insert({
        article_id: null,
        topic: '(erro antes do scraping)',
        model_used: 'unknown',
        status: 'error',
        error_message: msg,
      })
    } catch { /* ignore secondary failure */ }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
