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

  // Extract body content (strip head, nav, footer, scripts, styles — keep article body)
  const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[0] : html

  const cleanBody = bodyHtml
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')

  // Extract visible text
  const text = cleanBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 14000)

  // Extract og:image (cover)
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)

  // Extract all <img src> from body (preserves order = position in article)
  const imgMatches = [...cleanBody.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]

  const resolveUrl = (src: string): string | null => {
    try { return new URL(src, url).href } catch { return null }
  }

  const isUsable = (src: string) =>
    (src.startsWith('http://') || src.startsWith('https://')) &&
    !/pixel|icon|logo|avatar|1x1|spacer|sprite|svg\?|\.svg$/i.test(src)

  const allImages = [
    ogMatch?.[1] ? resolveUrl(ogMatch[1]) : null,
    ...imgMatches.map((m) => resolveUrl(m[1])),
  ]
    .filter((src): src is string => !!src && isUsable(src))
    // Deduplicate preserving order
    .filter((src, idx, arr) => arr.indexOf(src) === idx)
    .slice(0, 12)

  return { text, images: allImages }
}

// ─── AI providers ─────────────────────────────────────────────────────────────

function buildSystemPrompt(persona: string): string {
  return `Você é ${persona}.
Sua tarefa é traduzir e adaptar artigos para Português Brasileiro (pt-BR) para uma plataforma exclusiva de membros focada em trading algorítmico.
Seja fiel à estrutura e conteúdo do original. Use linguagem acessível para traders intermediários.
Retorne APENAS um objeto JSON válido — sem markdown, sem código-fonte extra fora do JSON.`
}

function buildArticlePrompt(sourceText: string, category: string, sourceUrl: string, images: string[]): string {
  const imageListBlock = images.length > 0
    ? `\nImagens disponíveis extraídas do artigo original (use-as inline no HTML na posição relevante via <img src="URL" alt="descrição" style="max-width:100%;border-radius:8px;margin:16px 0">):\n${images.map((u, i) => `${i + 1}. ${u}`).join('\n')}\n`
    : ''

  return `Traduza e adapte fielmente o seguinte artigo para Português Brasileiro, mantendo a mesma estrutura, sequência de tópicos, exemplos e profundidade do original. O objetivo é que o leitor receba a mesma informação do artigo original, em pt-BR, com clareza.

Fonte: ${sourceUrl}

---CONTEÚDO ORIGINAL---
${sourceText}
---FIM DO CONTEÚDO---
${imageListBlock}
Instruções:
- Mantenha a mesma estrutura de seções e ordem dos tópicos do original
- Traduza e adapte o texto com fidelidade — não invente tópicos novos
- Use HTML semântico: <h2>, <h3>, <p>, <ul>/<ol>, <strong>
- Insira as imagens listadas acima inline no HTML no ponto relevante do texto usando a tag <img> fornecida
- Sem tags <html>/<body>/<head>/<script>
- Mínimo 600 palavras

Retorne JSON com EXATAMENTE estes campos:
{
  "title": "título fiel ao original, em pt-BR (máximo 80 caracteres)",
  "content": "artigo completo em HTML semântico com imagens inline",
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
    const userPrompt = buildArticlePrompt(sourceText, category, body.source_url, sourceImages)

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
