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

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string, model: string): Promise<string> {
  const modelName = model || 'gemini-2.0-flash-lite'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000) // 45s timeout

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.6 },
        }),
        signal: controller.signal,
      },
    )
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } finally {
    clearTimeout(timeout)
  }
}

async function callGroq(systemPrompt: string, userPrompt: string, apiKey: string, model: string): Promise<string> {
  const modelName = model || 'llama-3.3-70b-versatile'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000) // 45s timeout

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    if (!text) throw new Error('Empty Groq response')
    return text
  } finally {
    clearTimeout(timeout)
  }
}

async function generateText(
  systemPrompt: string,
  userPrompt: string,
  config: { 
    gemini_api_key?: string, 
    gemini_model?: string, 
    gemini_model_2?: string, 
    gemini_model_3?: string, 
    groq_api_key?: string, 
    groq_model?: string 
  }
): Promise<{ text: string; model: string }> {
  const geminiKey = config.gemini_api_key || GEMINI_API_KEY
  
  if (geminiKey) {
    // 1. Try Gemini Model 1
    try {
      const model = config.gemini_model || 'gemini-2.0-flash-lite';
      (globalThis as any).lastModelUsed = `gemini/${model}`;
      return { text: await callGemini(systemPrompt, userPrompt, geminiKey, model), model: `gemini/${model}` }
    } catch (e) {
      console.error('Gemini Model 1 failed:', e instanceof Error ? e.message : JSON.stringify(e))
    }

    // 2. Try Gemini Model 2 (Cascata)
    if (config.gemini_model_2) {
      try {
        (globalThis as any).lastModelUsed = `gemini/${config.gemini_model_2}`;
        return { text: await callGemini(systemPrompt, userPrompt, geminiKey, config.gemini_model_2), model: `gemini/${config.gemini_model_2}` }
      } catch (e) {
        console.error('Gemini Model 2 failed:', e instanceof Error ? e.message : JSON.stringify(e))
      }
    }

    // 3. Try Gemini Model 3 (Cascata)
    if (config.gemini_model_3) {
      try {
        (globalThis as any).lastModelUsed = `gemini/${config.gemini_model_3}`;
        return { text: await callGemini(systemPrompt, userPrompt, geminiKey, config.gemini_model_3), model: `gemini/${config.gemini_model_3}` }
      } catch (e) {
        console.error('Gemini Model 3 failed:', e instanceof Error ? e.message : JSON.stringify(e))
      }
    }
  }

  // 4. Final Fallback to Groq
  const groqKey = config.groq_api_key || GROQ_API_KEY
  if (groqKey) {
    try {
      const model = config.groq_model || 'llama-3.3-70b-versatile';
      (globalThis as any).lastModelUsed = `groq/${model}`;
      return { text: await callGroq(systemPrompt, userPrompt, groqKey, model), model: `groq/${model}` }
    } catch (e) {
      console.error('Groq failed:', e)
    }
  }

  throw new Error('All AI providers failed — check AI configurations in Admin Panel or Environment Variables')
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  }

  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('access-control-request-headers')
    return new Response('ok', {
      headers: { ...corsHeaders, ...(reqHeaders ? { 'Access-Control-Allow-Headers': reqHeaders } : {}) },
    })
  }

  // Parse body BEFORE starting the stream to catch immediate errors
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ type: 'error', error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!body.source_url) {
    return new Response(JSON.stringify({ type: 'error', error: 'source_url is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const streamEncoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (status: string) => {
        controller.enqueue(streamEncoder.encode(JSON.stringify({ type: 'progress', status }) + '\n'))
      }

      const sendResult = (data: any) => {
        controller.enqueue(streamEncoder.encode(JSON.stringify({ type: 'result', ...data }) + '\n'))
        controller.close()
      }

      const sendError = (error: string) => {
        controller.enqueue(streamEncoder.encode(JSON.stringify({ type: 'error', error }) + '\n'))
        controller.close()
      }

      let sourceUrlForLog = body.source_url || '(não informado)'
      
      try {
        // Validate URL format
        try { new URL(body.source_url) } catch {
          return sendError('source_url is not a valid URL')
        }

        sendProgress('Buscando configurações...')

        // 0. Fetch AI Config from DB
        const { data: aiConfig, error: configError } = await supabase
          .from('ai_configurations')
          .select('*')
          .maybeSingle();
        
        if (configError) console.warn('Could not fetch ai_configurations:', configError);

        const persona = body.writer_persona
          ?? 'um educador especialista em trading algorítmico, programação MQL5, análise técnica e gestão de risco para traders de varejo'
        const category = body.default_category ?? 'Análise Geral'

        // 1. Scrape source page
        sendProgress('Extraindo conteúdo da URL...')
        console.log('Scraping URL:', body.source_url)
        const { text: sourceText, images: sourceImages } = await scrapePage(body.source_url)
        console.log('Scrape done. Text length:', sourceText.length)

        if (sourceText.length < 200) {
          return sendError('A página de origem retornou pouco texto para gerar um artigo')
        }

        // 2. Generate article via AI
        sendProgress('Gerando artigo com IA...')
        const systemPrompt = buildSystemPrompt(persona)
        const userPrompt = buildArticlePrompt(sourceText, category, body.source_url, sourceImages)

        let modelUsed = 'unknown'
        let rawAI = ''

        try {
          const result = await generateText(systemPrompt, userPrompt, aiConfig || {})
          rawAI = result.text
          modelUsed = result.model
        } catch (e) {
          throw e
        }

        sendProgress('Finalizando e salvando...')
        const parsed = parseAIJson(rawAI) as ArticlePayload

        if (!parsed.title || !parsed.content) {
          throw new Error('A resposta da IA não contém título ou conteúdo')
        }

        // 3. Use images extracted directly from source page (first one = cover)
        const coverImageUrl = sourceImages[0] ?? null

        // 4. Insert article
        const { data: articleData, error: insertError } = await supabase
          .from('articles')
          .insert({
            title: parsed.title,
            content: parsed.content,
            excerpt: parsed.excerpt ?? '',
            category,
            image_url: coverImageUrl,
            gallery_urls: sourceImages,
            author: 'IA Trader AFK',
            ai_generated: true,
          })
          .select('id')
          .single()

        if (insertError) throw new Error(`Falha no banco de dados: ${insertError.message ?? JSON.stringify(insertError)}`)

        // 5. Log execution
        await supabase.from('article_automation_logs').insert({
          article_id: articleData?.id ?? null,
          topic: body.source_url,
          model_used: modelUsed,
          status: 'success',
        })

        sendResult({
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

        // Best-effort error log
        try {
          await supabase.from('article_automation_logs').insert({
            article_id: null,
            topic: sourceUrlForLog,
            model_used: (globalThis as any).lastModelUsed || 'unknown',
            status: 'error',
            error_message: msg,
          })
        } catch { /* ignore secondary failure */ }

        sendError(msg)
      }
    }
  })

  return new Response(stream, {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})
