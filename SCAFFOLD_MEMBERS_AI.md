# Scaffold Prompt — AI Article Automation para Área de Membros

---

## ⛔ RESTRIÇÕES CRÍTICAS — LEIA ANTES DE QUALQUER COISA

Este projeto possui um **sistema de licenciamento de robôs (Expert Advisors)** em produção com usuários reais. Qualquer alteração acidental nessas tabelas pode derrubar o acesso de clientes pagantes.

**É terminantemente proibido:**

- Alterar, renomear, dropar ou fazer migrate em qualquer tabela relacionada a licenças, produtos ou assinaturas
- Adicionar ou remover colunas em tabelas existentes que não sejam `articles`
- Criar foreign keys apontando para tabelas de licenças
- Modificar RLS policies de tabelas existentes (apenas criar policies nas tabelas **novas** criadas por este scaffold)
- Executar qualquer `DROP`, `TRUNCATE`, `ALTER TABLE` em tabelas já existentes
- Tocar nos arquivos de componentes que não sejam `AdminPanel.tsx` e `Education.tsx` — e mesmo nesses, apenas **adicionar** código, nunca remover ou refatorar o existente

**Tabelas que você NÃO pode tocar sob nenhuma circunstância:**

```
products        ← catálogo de robôs/cursos vinculado às licenças
modules         ← estrutura de cursos (não alterar schema)
lessons         ← aulas vinculadas aos módulos
profiles        ← roles e dados dos usuários (não alterar schema)
licenses        ← (se existir) tabela central do sistema de licenças
subscriptions   ← (se existir) assinaturas ativas
activations     ← (se existir) ativações de licença por dispositivo
```

> Se ao explorar o projeto você encontrar outras tabelas relacionadas a licenças, ativações, chaves de produto, dispositivos ou pagamentos — **não as toque**. Em caso de dúvida sobre se uma tabela é sensível, **pergunte antes de agir**.

**Regra geral:** este scaffold cria apenas **2 tabelas novas** (`article_automation_settings` e `article_automation_logs`) e **1 coluna opcional** (`articles.ai_generated`). Nada além disso deve ser criado ou alterado no banco.

---

## Contexto do Projeto

Este é um webapp de **área de membros** construído em:

- **Frontend:** React 19 + Vite + TypeScript
- **Estilização:** Tailwind CSS (CDN) + Vanilla CSS customizado (`index.css`)
- **Arquitetura:** SPA moderna com imports via `esm.sh` no `index.html`
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Auth:** Supabase Auth com `AuthContext` customizado
- **Roles:** `admin`, `client`, `partner`, `first_mate` (definidos em `profiles.role`)

### Estrutura existente relevante

```
src/
  components/
    Education.tsx          ← view principal de educação (artigos + cursos)
    AdminPanel.tsx         ← painel admin com CRUD de cursos/módulos/aulas/artigos
    AuthContext.tsx        ← contexto de autenticação global
  App.tsx                 ← roteamento principal da SPA
```

### Tabelas Supabase já existentes

```sql
profiles       (id, role: 'admin'|'client'|'partner'|'first_mate', ...)
products       (id, type: 'course', ...)
modules        (id, product_id, title, order, ...)
lessons        (id, module_id, title, video_url, ...)
articles       (id, title, content, category, images: jsonb, published_at, ...)
```

---

## Objetivo

Implementar um **sistema de geração automática de artigos educacionais via IA** que:

1. Gera artigos sobre trading algorítmico, MQL5, Expert Advisors e análise técnica
2. Publica diretamente na tabela `articles` do Supabase (visível na Education view)
3. É controlado por um **Supabase Edge Function** agendado via `pg_cron` ou chamado manualmente pelo admin
4. É **configurável pelo AdminPanel** sem alterar código (tópicos, persona da IA, volume, dias ativos)
5. Respeita roles — artigos gerados ficam visíveis para todos os membros autenticados

---

## O que implementar

### 1. Tabelas novas no Supabase

```sql
-- Configurações da automação de artigos educacionais
CREATE TABLE IF NOT EXISTS public.article_automation_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled          boolean NOT NULL DEFAULT true,
  articles_per_day    integer NOT NULL DEFAULT 2,
  active_days         integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  cron_schedule       text NOT NULL DEFAULT '0 9 * * *',
  topics              text NOT NULL DEFAULT 'Trading Algorítmico e Expert Advisors
Programação MQL5 para MetaTrader
Análise Técnica Aplicada
Gestão de Risco em Trading
Backtest e Otimização de Estratégias',
  writer_persona      text NOT NULL DEFAULT 'expert educator specializing in algorithmic trading, MQL5 programming, technical analysis and risk management for retail traders',
  positive_keywords   text NOT NULL DEFAULT 'trading
mql5
expert advisor
metatrader
backtest
análise técnica
gestão de risco
automação
estratégia',
  negative_keywords   text NOT NULL DEFAULT 'crypto
bitcoin
nft
apostas
loteria
esquema
pirâmide',
  auto_translate      boolean NOT NULL DEFAULT true,
  default_category    text NOT NULL DEFAULT 'Análise Geral',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Log de execuções da automação
CREATE TABLE IF NOT EXISTS public.article_automation_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  topic           text NOT NULL,
  model_used      text NOT NULL,
  status          text NOT NULL CHECK (status IN ('success', 'error')),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Row com configurações iniciais
INSERT INTO public.article_automation_settings DEFAULT VALUES;
```

**RLS:**
```sql
-- Apenas admins leem/escrevem as configurações
ALTER TABLE public.article_automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON public.article_automation_settings
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Logs: admin lê, service role escreve
ALTER TABLE public.article_automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_logs" ON public.article_automation_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

### 2. Supabase Edge Function — `generate-articles`

Criar em `supabase/functions/generate-articles/index.ts`.

**Responsabilidades:**
- Ler configurações de `article_automation_settings`
- Verificar se hoje é um dia ativo e se `is_enabled = true`
- Para cada slot (até `articles_per_day`): escolher um tópico rotacionado, gerar artigo via IA, inserir em `articles`
- Registrar resultado em `article_automation_logs`
- Aceitar chamada manual via POST com header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

**Cascata de modelos IA (ordem de preferência):**
1. Google Gemini Flash (`gemini-2.0-flash-lite`) — via REST API
2. Groq Llama 3.3 70B — via REST API (`https://api.groq.com/openai/v1/chat/completions`)
3. Fallback: Gemma 3 27B via Google AI

**Detecção e tradução automática:**
- Se o artigo de referência (RSS/NewsAPI) estiver em inglês, traduzir título e resumo via Gemini antes de gerar
- Toggle `auto_translate` nas configurações controla esse comportamento

**Prompt do sistema (buildSystemPrompt):**
```
You are an {writer_persona}.
Write an educational article in Brazilian Portuguese (pt-BR) for a members-only trading platform.
The article must be practical, based on real techniques, and suitable for intermediate traders.
Return ONLY a valid JSON object — no markdown, no extra text.
```

**Prompt do usuário (buildArticlePrompt):**
```
Write an educational article in Brazilian Portuguese about: {topic}

Return JSON with EXACTLY these fields:
{
  "title": "article title (max 80 chars)",
  "content": "full article in semantic HTML: <h2>, <h3>, <p>, <ul>/<ol>. Minimum 600 words. No <html>/<body>/<script> tags.",
  "excerpt": "one sentence summary (max 160 chars)",
  "category": "{default_category}",
  "image_prompt": "English prompt for cover image: professional trading desk, charts, MetaTrader screens or abstract data visualization"
}
```

**Inserção em `articles`:**
```typescript
await supabase.from('articles').insert({
  title,
  content,
  category: settings.default_category,
  images: coverImageUrl ? [{ url: coverImageUrl, caption: '' }] : [],
  published_at: new Date().toISOString(),
  // adicionar campos que já existem na tabela articles
})
```

**Geração de imagem de capa (opcional — best-effort):**
- Tentar HuggingFace FLUX via Gradio client
- Fallback: Unsplash API com query do `image_prompt`
- Fallback final: `null` (artigo sem imagem — Education.tsx já trata esse caso)
- Se gerada, fazer upload para Supabase Storage bucket `article-images`

---

### 3. Variáveis de ambiente necessárias

Configurar em `supabase/functions/.env` e no dashboard Supabase → Edge Functions → Secrets:

```
GEMINI_API_KEY=         # Google AI Studio
GROQ_API_KEY=           # console.groq.com (opcional — fallback)
HF_TOKEN=               # HuggingFace (opcional — geração de imagem)
UNSPLASH_ACCESS_KEY=    # Unsplash API (opcional — fallback de imagem)
SUPABASE_URL=           # já disponível por padrão nas Edge Functions
SUPABASE_SERVICE_ROLE_KEY= # já disponível por padrão nas Edge Functions
```

---

### 4. Agendamento via pg_cron

No Supabase SQL Editor:

```sql
-- Requer extensão pg_cron (disponível no Supabase)
SELECT cron.schedule(
  'generate-articles-daily',
  '0 9 * * *',   -- 9h UTC (6h Brasília) todos os dias
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-articles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Alternativa mais simples: chamar via GitHub Actions cron ou Vercel cron apontando para a Edge Function URL.

---

### 5. Painel Admin — aba "Automação de Artigos"

Adicionar dentro do `AdminPanel.tsx` existente uma nova aba/seção: **"Automação IA"**.

**Componente sugerido:** `ArticleAutomationSettings.tsx`

**Campos a exibir:**

```
[ toggle ] Sistema ativo
[ number ] Artigos por dia  (1–10)
[ chips  ] Dias ativos      (Dom–Sáb)
[ textarea ] Tópicos        (um por linha)
[ textarea ] Persona do redator IA
[ textarea ] Keywords de boost  (uma por linha)
[ textarea ] Keywords de penalidade (uma por linha)
[ toggle ] Tradução automática EN→PT
[ text   ] Categoria padrão dos artigos gerados
[ button ] "Gerar agora" → POST /functions/v1/generate-articles (feedback de loading/sucesso)
[ table  ] Últimas 20 execuções (de article_automation_logs)
```

**Lógica do componente:**
```typescript
// Carregar settings
const { data } = await supabase
  .from('article_automation_settings')
  .select('*')
  .single()

// Salvar settings
await supabase
  .from('article_automation_settings')
  .update({ ...formData })
  .eq('id', settings.id)

// Gerar manualmente
const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-articles`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ manual: true }),
})
```

**Proteção de rota:** verificar `profile.role === 'admin'` antes de renderizar o componente.

---

### 6. Integration com Education.tsx

Os artigos gerados já aparecem automaticamente na `Education` view pois são inseridos diretamente na tabela `articles` — **nenhuma mudança necessária no frontend** se a query existente já faz `SELECT * FROM articles ORDER BY published_at DESC`.

Se a query filtra por categoria, garantir que `default_category` na configuração da automação bata com uma categoria já existente no sistema.

**Diferencial visual (opcional):** adicionar badge "IA" nos artigos gerados:
```sql
-- Adicionar coluna se não existir
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false;
```
```typescript
// No Education.tsx
{article.ai_generated && (
  <span className="badge badge-ai">IA</span>
)}
```

---

## Ordem de implementação recomendada

1. **SQL** — rodar as migrations (tabelas + RLS + insert inicial)
2. **Edge Function** — criar `supabase/functions/generate-articles/index.ts` com o pipeline completo
3. **Testar** — `supabase functions serve generate-articles` localmente e chamar via curl
4. **AdminPanel** — criar `ArticleAutomationSettings.tsx` e integrar na aba admin
5. **Agendamento** — configurar pg_cron ou cron externo
6. **Badge IA** — opcional, adicionar coluna e badge no Education.tsx

---

## Referências técnicas

### Chamada Gemini Flash via REST (sem SDK)
```typescript
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    }),
  }
)
const data = await res.json()
const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
```

### Chamada Groq via REST
```typescript
const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  }),
})
const data = await res.json()
const text = data.choices?.[0]?.message?.content ?? ''
```

> **Importante:** Edge Functions Deno não têm acesso a SDKs Node. Use fetch REST direto para todas as chamadas de IA. Não use `import { GoogleGenerativeAI } from '@google/generative-ai'` — use a REST API diretamente.

### Parse robusto do JSON retornado pela IA
```typescript
function parseAIJson(raw: string): unknown {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try { return JSON.parse(cleaned) } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('No JSON found in AI response')
  }
}
```

### Detecção de inglês (heurística leve)
```typescript
function isEnglish(text: string): boolean {
  const markers = ['the ', ' is ', ' are ', ' was ', ' for ', ' with ', ' that ', ' this ', ' from ']
  const lower = text.toLowerCase()
  return markers.filter(w => lower.includes(w)).length >= 3
}
```

### Upload de imagem para Supabase Storage (Deno)
```typescript
async function uploadImageFromUrl(imageUrl: string, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return null
    const buffer = await imgRes.arrayBuffer()
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
    const path = `ai-generated/${Date.now()}.${ext}`

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/article-images/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': contentType,
          'x-upsert': 'false',
        },
        body: buffer,
      }
    )
    if (!uploadRes.ok) return null
    return `${supabaseUrl}/storage/v1/object/public/article-images/${path}`
  } catch { return null }
}
```

---

## O que NÃO fazer

- ❌ Não instalar SDKs Node (`@google/generative-ai`, `groq-sdk`) — use fetch REST
- ❌ Não criar nova autenticação — usar o `AuthContext` existente
- ❌ Não criar nova tabela de usuários — usar `profiles` existente
- ❌ Não alterar o schema de `articles` além da coluna `ai_generated` opcional
- ❌ Não criar páginas novas — integrar tudo no `AdminPanel.tsx` e `Education.tsx` existentes
- ❌ Não usar `localStorage` para guardar configurações — tudo vai para `article_automation_settings`

---

## Checklist de entrega

- [ ] Migration SQL rodada no Supabase (tabelas + RLS + row inicial)
- [ ] `supabase/functions/generate-articles/index.ts` implementado e testado localmente
- [ ] Chamada manual via curl retorna artigo inserido em `articles`
- [ ] `ArticleAutomationSettings.tsx` criado e integrado no `AdminPanel.tsx`
- [ ] Toggle liga/desliga funciona e persiste no banco
- [ ] Botão "Gerar agora" mostra loading e feedback de sucesso/erro
- [ ] Log das últimas execuções visível na aba admin
- [ ] Artigos gerados aparecem automaticamente na `Education` view
- [ ] Agendamento configurado (pg_cron ou alternativa)
- [ ] Variáveis de ambiente configuradas nos Secrets da Edge Function
