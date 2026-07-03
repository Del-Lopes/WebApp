# Prompt de Implementação — Feature "Hand Bot" (controle remoto de parâmetros do EA)

> **Como usar este arquivo:** cole o conteúdo abaixo como prompt para a IA da **Lovable** (ou entregue para o dev que for implementar). Ele descreve, de ponta a ponta, como replicar a sessão **Hand Bot** num novo projeto que também usa **Supabase**. A feature já existe e está validada em produção em outro projeto; este documento reproduz **fielmente** o mesmo comportamento.
>
> **Escopo:** apenas **Dashboard (frontend)** + **Supabase (banco + edge functions)**. Nada sobre MT5/EA é tratado aqui — o EA já existe e é mantido separadamente. Só há **um** requisito de contrato para o EA funcionar (endereço/URL e formato de resposta), documentado na seção final; o implementador **não** precisa nem terá acesso ao código do EA.

---

## 1. O que é a feature

O **Hand Bot** é uma sessão do webapp onde o usuário:

1. **Conecta** uma conta MetaTrader 5 (MT5) informando o número da conta. O sistema gera uma **API Key** (token) exibida **uma única vez**, que o usuário cola no EA (Expert Advisor) instalado no MT5 dele.
2. **Ajusta remotamente** dezenas de parâmetros do robô (trailing stop, break even, grids, hedge, etc.) através de um formulário.
3. Ao salvar, os parâmetros ficam pendentes de sincronização (`needs_sync = true`). O EA faz *polling* e busca os novos valores quando há mudança.
4. Pode **gerenciar** a conexão: rotacionar (revogar + gerar nova) a chave, ou desconectar (apaga vínculo e parâmetros).
5. Pode ter **múltiplas contas MT5** vinculadas, alternando entre elas por um seletor.

O modelo de autenticação do EA é **token opaco gerado pelo painel** (mesmo padrão que o projeto já usa hoje): o usuário gera a chave no dashboard e cola no EA. O backend guarda apenas o **hash SHA-256** da chave; o texto plano nunca é persistido.

---

## 2. Arquitetura (visão geral)

```
┌─────────────┐        JWT do usuário          ┌──────────────────────┐
│  Dashboard  │ ─────────────────────────────► │  Edge: handbot-link  │  connect / rotate / disconnect
│  (React)    │                                └──────────────────────┘
│             │        JWT do usuário          ┌──────────────────────┐
│             │ ─────────────────────────────► │  Edge: handbot-params│  GET link / GET user-params / POST save
└─────────────┘                                └──────────────────────┘
                                                          │ service_role
                                                          ▼
                                               ┌──────────────────────┐
                                               │  Postgres (Supabase) │  handbot_link + handbot_params
                                               └──────────────────────┘
                                                          ▲
      ┌───────────────┐   Bearer <api_key>               │
      │   EA (MT5)    │ ─────────────────────────────────┘  (já existe — fora do escopo deste doc,
      │  já existe    │   + PostgREST com anon key (needs_sync)   ver contrato na seção 8)
      └───────────────┘
```

Pontos-chave de design (replicar exatamente):

- **A chave nunca é armazenada em texto plano.** Guarda-se `api_key_hash = sha256(api_key)` e um `api_key_prefix` (13 primeiros caracteres) só para exibição ("txp_hbot_a3f9••••").
- **As edge functions usam `service_role`** para ler/gravar (bypassa RLS). A autenticação do usuário é validada via JWT (`Authorization: Bearer <jwt>`); a do EA, via a API Key no `Authorization: Bearer <api_key>`.
- **Otimização de custo:** o EA verifica primeiro a flag `needs_sync` via **PostgREST direto** (usando a anon key — não conta como invocação de edge function). Só chama a edge function `handbot-params` (GET) quando `needs_sync = true`. Ao salvar pelo dashboard, `needs_sync` vira `true`; ao o EA buscar os params, a function seta de volta para `false`.

---

## 3. Passo a passo de implementação

Siga nesta ordem. Cada passo é auto-contido.

### Passo 1 — Criar a migration do Supabase

Crie **um único arquivo** de migration (a IA da Lovable deve gerar o arquivo com o timestamp adequado no diretório `supabase/migrations/`, ex.: `supabase/migrations/<YYYYMMDDHHMMSS>_handbot.sql`). Use o **DDL consolidado** da seção 4 abaixo — ele já reúne todas as evoluções do schema num só arquivo, então **não** é preciso criar várias migrations incrementais.

> Instrução ao implementador: rode a migration no ambiente do novo projeto (`supabase db push` ou pelo painel SQL Editor). Confirme que as tabelas `handbot_link` e `handbot_params` foram criadas com RLS habilitado.

### Passo 2 — Criar as duas Edge Functions

Crie:

- `supabase/functions/handbot-link/index.ts` → seção 5
- `supabase/functions/handbot-params/index.ts` → seção 6

Deploy de ambas. **Atenção crítica:** desligue a verificação de JWT nativa do Supabase (`Verify JWT`) na function **`handbot-params`**, porque o EA chama endpoints dela sem um JWT válido (usa a API Key própria). Se o "Verify JWT" ficar ligado, o Supabase rejeita a chamada do EA com 401 **antes** do código rodar. A validação de identidade é feita dentro do código.

Configuração no painel (Edge Functions → cada function → Settings):
- `handbot-params`: **Verify JWT = OFF**.
- `handbot-link`: pode manter Verify JWT ON ou OFF; o código valida o JWT do usuário por conta própria. Recomenda-se **OFF** para consistência (o código já trata `unauthorized`).

As functions usam as variáveis de ambiente padrão do Supabase, já disponíveis no runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Nenhum secret adicional é necessário.

### Passo 3 — Adicionar o cliente/wrapper no frontend

Crie `lib/handbotLink.ts` (seção 7.1). Ele encapsula todas as chamadas às edge functions e exporta os tipos `HandbotLink` e `HandbotParams`.

Requisito: já deve existir um cliente Supabase inicializado em `lib/supabase.ts` (padrão), exportando `supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. As variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` devem apontar para o **novo projeto**.

### Passo 4 — Criar o componente da sessão

Crie `components/HandBot/HandBot.tsx` (seção 7.2). É um componente React único, auto-contido, com subcomponentes internos (ConnectSection, ManageSection, ParamsForm, AccountSelector). Usa `lucide-react` para ícones e Tailwind para estilo.

### Passo 5 — Integrar na navegação

Registre a sessão no roteamento/navegação do app (menu lateral + view). No projeto de referência é lazy-loaded:

```tsx
const HandBot = React.lazy(() =>
  import('./components/HandBot/HandBot').then(m => ({ default: m.HandBot }))
);
// ...
// no switch de views:
return <HandBot onBack={() => setCurrentView('dashboard')} />;
```

Adapte ao padrão de navegação do novo projeto (React Router, estado de view, etc.). Adicione um item de menu "Hand Bot" apontando para essa view.

### Passo 6 — Validar

Checklist da seção 9.

---

## 4. DDL consolidado da migration

> Cole isto como o conteúdo do arquivo de migration. Reúne todas as colunas e políticas da versão final de produção. Idempotente (`if not exists`).

```sql
-- ============================================================================
-- Hand Bot — vínculo (token) + parâmetros do EA controlados pelo dashboard
-- Tabelas: handbot_link, handbot_params
-- ============================================================================

-- ─── handbot_link ────────────────────────────────────────────────────────────
create table if not exists public.handbot_link (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  account_login      bigint not null,
  broker_display     text,
  api_key_hash       text not null unique,   -- sha256(api_key)
  api_key_prefix     text not null,          -- 13 primeiros chars, só p/ exibição
  api_key_created_at timestamptz not null default now(),
  api_key_revoked_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Cada usuário: no máximo um Hand Bot por conta MT5
create unique index if not exists handbot_link_user_account_idx
  on public.handbot_link (user_id, account_login);

-- ─── handbot_params ──────────────────────────────────────────────────────────
-- Uma linha por link (conta MT5). Todos os parâmetros configuráveis do EA.
create table if not exists public.handbot_params (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  handbot_link_id             uuid not null references public.handbot_link(id) on delete cascade,

  -- Flag de sincronização: true quando o usuário salvou e o EA ainda não buscou
  needs_sync                  boolean not null default false,

  -- Trailing Avg
  trailing_avg_enabled        boolean not null default true,
  trailing_avg_distance       integer not null default 120,
  trailing_avg_stop           integer not null default 100,

  -- Trailing Stop pts
  trailing_pts_enabled        boolean not null default true,
  trailing_pts_distance       integer not null default 220,
  trailing_pts_stop           integer not null default 140,

  -- Break Even avg price
  break_even_avg_enabled      boolean not null default true,
  break_even_avg_distance     integer not null default 50,
  break_even_avg_gain         integer not null default 20,

  -- Break Even pts
  break_even_pts_enabled      boolean not null default true,
  break_even_pts_distance     integer not null default 30,
  break_even_pts_gain         integer not null default 10,

  -- Add - Points
  add_points_enabled          boolean not null default false,
  add_points_lot              numeric(10,2) not null default 0.01,
  add_points_distance         integer not null default 250,
  add_points_avg_distance     integer not null default 300,

  -- Grid à Favor (legado global — mantido por compatibilidade)
  grid_ahead_enabled          boolean not null default false,
  grid_ahead_distance         numeric(10,1) not null default 550.0,
  grid_ahead_multiplier       numeric(10,2) not null default 1.1,

  -- Grid à Favor — Compra
  grid_ahead_enabled_buy      boolean not null default false,
  grid_ahead_distance_buy     double precision not null default 550.0,
  grid_ahead_multiplier_buy   double precision not null default 1.1,
  grid_ahead_lot_buy          double precision not null default 0.01,

  -- Grid à Favor — Venda
  grid_ahead_enabled_sell     boolean not null default false,
  grid_ahead_distance_sell    double precision not null default 550.0,
  grid_ahead_multiplier_sell  double precision not null default 1.1,
  grid_ahead_lot_sell         double precision not null default 0.01,

  -- Grid Contra (legado global — mantido por compatibilidade)
  grid_contra_enabled         boolean not null default false,
  grid_contra_lot             numeric(10,2) not null default 0.01,
  grid_contra_distance        numeric(10,1) not null default 60.0,
  grid_contra_multiplier      numeric(10,2) not null default 1.0,
  grid_contra_max_orders      integer not null default 200,

  -- Grid Contra — Compra
  grid_contra_enabled_buy     boolean not null default false,
  grid_contra_lot_buy         double precision not null default 0.01,
  grid_contra_distance_buy    double precision not null default 60.0,
  grid_contra_multiplier_buy  double precision not null default 1.0,

  -- Grid Contra — Venda
  grid_contra_enabled_sell    boolean not null default false,
  grid_contra_lot_sell        double precision not null default 0.01,
  grid_contra_distance_sell   double precision not null default 60.0,
  grid_contra_multiplier_sell double precision not null default 1.0,

  -- Negociação Automática
  allow_buy                   boolean not null default false,
  allow_sell                  boolean not null default false,

  -- Atualização de Stop e Entrada Barra-a-Barra
  bar_folga_stop              integer not null default 50,
  bar_trailing_enabled        boolean not null default false,
  -- Timeframe: valor numérico do ENUM_TIMEFRAMES do MT5
  -- 0=Atual, 1=M1, 5=M5, 15=M15, 30=M30, 16385=H1, 16386=H2, 16387=H3,
  -- 16388=H4, 16390=H6, 16392=H8, 16396=H12, 16408=D1, 32769=W1, 49153=MN1
  bar_timeframe               integer not null default 0,
  bar_refresh_entry           boolean not null default false,

  -- Reset Global (Cut Gain Dinâmico)
  reset_value_to_add          double precision not null default 100,

  -- Hedge Dinâmico
  dynamic_hedge_enabled       boolean not null default false,
  dynamic_hedge_percent       double precision not null default 1.0,

  -- Operações Manuais
  include_manual_trades       boolean not null default false,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- Uma linha de params por conta MT5 (link)
  constraint handbot_params_link_id_key unique (handbot_link_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.handbot_link   enable row level security;
alter table public.handbot_params enable row level security;

-- handbot_link: dono gerencia os próprios links
create policy "handbot_link_owner_select" on public.handbot_link
  for select using (auth.uid() = user_id);
create policy "handbot_link_owner_insert" on public.handbot_link
  for insert with check (auth.uid() = user_id);
create policy "handbot_link_owner_update" on public.handbot_link
  for update using (auth.uid() = user_id);
create policy "handbot_link_owner_delete" on public.handbot_link
  for delete using (auth.uid() = user_id);

-- (Opcional) admins podem ver todos os links.
-- Só habilite se o novo projeto tiver uma tabela public.profiles com coluna role.
-- create policy "handbot_link_admin_select" on public.handbot_link
--   for select using (
--     exists (
--       select 1 from public.profiles
--       where profiles.id = auth.uid()
--         and profiles.role in ('admin', 'first_mate')
--     )
--   );

-- handbot_params: dono lê/escreve (service_role da edge fn bypassa RLS)
create policy "handbot_params_owner_select" on public.handbot_params
  for select using (auth.uid() = user_id);
create policy "handbot_params_owner_insert" on public.handbot_params
  for insert with check (auth.uid() = user_id);
create policy "handbot_params_owner_update" on public.handbot_params
  for update using (auth.uid() = user_id);

-- Permite ao EA ler needs_sync via PostgREST com a anon key.
-- O EA filtra por handbot_link_id (UUID opaco) e pede &select=needs_sync,
-- então nenhum outro campo é exposto na prática.
create policy "handbot_params_anon_needs_sync" on public.handbot_params
  for select to anon using (true);

-- ─── updated_at automático ───────────────────────────────────────────────────
create or replace function public.handbot_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists handbot_link_updated_at on public.handbot_link;
create trigger handbot_link_updated_at
  before update on public.handbot_link
  for each row execute function public.handbot_set_updated_at();

drop trigger if exists handbot_params_updated_at on public.handbot_params;
create trigger handbot_params_updated_at
  before update on public.handbot_params
  for each row execute function public.handbot_set_updated_at();
```

> **Nota sobre a policy `handbot_params_anon_needs_sync`:** ela é intencional e necessária para o EA verificar `needs_sync` sem gastar invocações de edge function. O EA só requisita a coluna `needs_sync` filtrando por um UUID opaco (`handbot_link_id`) que só ele conhece. Não há RLS por coluna no Postgres, mas como o EA só pede `&select=needs_sync`, os demais campos nunca trafegam. Se o novo projeto tiver política de segurança mais restritiva, uma alternativa é criar uma **VIEW** expondo apenas `handbot_link_id, needs_sync` e conceder SELECT à anon apenas nela — mas isso exigiria ajustar a URL que o EA consulta, então **mantenha a policy como está** salvo instrução em contrário.

---

## 5. Edge Function `handbot-link/index.ts`

Gerencia connect / rotate / disconnect. Autenticação via **JWT do usuário**.

```ts
// Supabase Edge Function — handbot-link
//   POST /functions/v1/handbot-link/connect    { account_login, broker_display? }
//     → cria link + devolve { api_key } (texto plano, exibido só uma vez)
//   POST /functions/v1/handbot-link/rotate     { link_id? }
//     → revoga chave atual e devolve nova { api_key }
//   POST /functions/v1/handbot-link/disconnect { link_id? }
//     → remove link (cascata apaga parâmetros)
// Autenticação: JWT do usuário (header Authorization).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function generateApiKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `txp_hbot_${hex}`
}

async function getAuthedUser(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

interface ConnectBody { account_login: number; broker_display?: string }

async function handleConnect(req: Request, userId: string): Promise<Response> {
  let body: ConnectBody
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'invalid_json' }) }

  if (typeof body.account_login !== 'number' || !Number.isFinite(body.account_login)) {
    return jsonResponse(400, { error: 'invalid_payload' })
  }

  // Bloqueia se já existe link para o mesmo (usuário, conta MT5)
  const { data: existing } = await supabaseAdmin
    .from('handbot_link').select('id')
    .eq('user_id', userId).eq('account_login', body.account_login).maybeSingle()
  if (existing) return jsonResponse(409, { error: 'already_connected' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 13) // "txp_hbot_a3f9"

  const { data: link, error: insErr } = await supabaseAdmin
    .from('handbot_link')
    .insert({
      user_id: userId,
      account_login: body.account_login,
      broker_display: body.broker_display ?? null,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
    })
    .select('id').single()

  if (insErr || !link) {
    console.error('[handbot-link] insert error', insErr)
    return jsonResponse(500, { error: 'insert_failed' })
  }

  // Cria linha de parâmetros com defaults
  const { error: paramsErr } = await supabaseAdmin
    .from('handbot_params')
    .insert({ user_id: userId, handbot_link_id: link.id })

  if (paramsErr) {
    console.error('[handbot-link] params insert error', paramsErr)
    await supabaseAdmin.from('handbot_link').delete().eq('id', link.id) // reverte
    return jsonResponse(500, { error: 'params_init_failed' })
  }

  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

async function handleRotate(req: Request, userId: string): Promise<Response> {
  let body: { link_id?: string } = {}
  try { body = await req.json() } catch { /* body opcional */ }

  const query = supabaseAdmin.from('handbot_link').select('id').eq('user_id', userId)
  if (body.link_id) query.eq('id', body.link_id)
  const { data: link } = await query.maybeSingle()
  if (!link) return jsonResponse(404, { error: 'link_not_found' })

  const apiKey = generateApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const apiKeyPrefix = apiKey.slice(0, 13)

  const { error: updErr } = await supabaseAdmin
    .from('handbot_link')
    .update({
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      api_key_created_at: new Date().toISOString(),
      api_key_revoked_at: null,
    })
    .eq('id', link.id)

  if (updErr) {
    console.error('[handbot-link] rotate error', updErr)
    return jsonResponse(500, { error: 'rotate_failed' })
  }
  return jsonResponse(200, { api_key: apiKey, api_key_prefix: apiKeyPrefix })
}

async function handleDisconnect(req: Request, userId: string): Promise<Response> {
  let body: { link_id?: string } = {}
  try { body = await req.json() } catch { /* body opcional */ }

  const query = supabaseAdmin.from('handbot_link').select('id').eq('user_id', userId)
  if (body.link_id) query.eq('id', body.link_id)
  const { data: link } = await query.maybeSingle()
  if (!link) return jsonResponse(404, { error: 'link_not_found' })

  const { error: delErr } = await supabaseAdmin.from('handbot_link').delete().eq('id', link.id)
  if (delErr) {
    console.error('[handbot-link] delete error', delErr)
    return jsonResponse(500, { error: 'delete_failed' })
  }
  return jsonResponse(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return jsonResponse(401, { error: 'unauthorized' })

  const action = new URL(req.url).pathname.split('/').filter(Boolean).pop()
  switch (action) {
    case 'connect':    return handleConnect(req, user.id)
    case 'rotate':     return handleRotate(req, user.id)
    case 'disconnect': return handleDisconnect(req, user.id)
    default:           return jsonResponse(404, { error: 'unknown_action' })
  }
})
```

---

## 6. Edge Function `handbot-params/index.ts`

Serve tanto o **EA** (GET com Bearer = API Key) quanto o **usuário** (JWT). **`Verify JWT` DEVE estar OFF** nesta function.

```ts
// Supabase Edge Function — handbot-params
//   GET  /functions/v1/handbot-params/link-id     Auth: Bearer <api_key>  → { link_id }
//   GET  /functions/v1/handbot-params             Auth: Bearer <api_key>  → parâmetros (p/ EA)
//   GET  /functions/v1/handbot-params/link        Auth: JWT               → { links: [...] }
//   GET  /functions/v1/handbot-params/user-params?link_id=  Auth: JWT     → { params }
//   POST /functions/v1/handbot-params             Auth: JWT   Body: {...params, link_id} → salva

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

async function getAuthedUser(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

// Lista de todos os campos de parâmetros (fonte única de verdade)
const PARAM_FIELDS = [
  'trailing_avg_enabled', 'trailing_avg_distance', 'trailing_avg_stop',
  'trailing_pts_enabled', 'trailing_pts_distance', 'trailing_pts_stop',
  'break_even_avg_enabled', 'break_even_avg_distance', 'break_even_avg_gain',
  'break_even_pts_enabled', 'break_even_pts_distance', 'break_even_pts_gain',
  'add_points_enabled', 'add_points_lot', 'add_points_distance', 'add_points_avg_distance',
  'grid_ahead_enabled', 'grid_ahead_distance', 'grid_ahead_multiplier',
  'grid_ahead_enabled_buy', 'grid_ahead_distance_buy', 'grid_ahead_multiplier_buy', 'grid_ahead_lot_buy',
  'grid_ahead_enabled_sell', 'grid_ahead_distance_sell', 'grid_ahead_multiplier_sell', 'grid_ahead_lot_sell',
  'grid_contra_enabled', 'grid_contra_lot', 'grid_contra_distance', 'grid_contra_multiplier', 'grid_contra_max_orders',
  'grid_contra_enabled_buy', 'grid_contra_lot_buy', 'grid_contra_distance_buy', 'grid_contra_multiplier_buy',
  'grid_contra_enabled_sell', 'grid_contra_lot_sell', 'grid_contra_distance_sell', 'grid_contra_multiplier_sell',
  'allow_buy', 'allow_sell',
  'bar_folga_stop', 'bar_trailing_enabled', 'bar_timeframe', 'bar_refresh_entry',
  'reset_value_to_add',
  'dynamic_hedge_enabled', 'dynamic_hedge_percent',
  'include_manual_trades',
]

// GET p/ EA: devolve apenas o link_id (o EA cacheia p/ usar no PostgREST)
async function handleEaLinkId(req: Request): Promise<Response> {
  const token = extractBearer(req)
  if (!token) return jsonResponse(401, { error: 'missing_bearer_token' })
  const tokenHash = await sha256Hex(token)

  const { data: link, error } = await supabaseAdmin
    .from('handbot_link').select('id, api_key_revoked_at')
    .eq('api_key_hash', tokenHash).maybeSingle()

  if (error) return jsonResponse(500, { error: 'internal_error' })
  if (!link) return jsonResponse(401, { error: 'invalid_token' })
  if (link.api_key_revoked_at) return jsonResponse(403, { error: 'token_revoked' })
  return jsonResponse(200, { link_id: link.id })
}

// GET p/ EA: autentica via Bearer (API Key), devolve parâmetros se needs_sync
async function handleEaGet(req: Request): Promise<Response> {
  const token = extractBearer(req)
  if (!token) return jsonResponse(401, { error: 'missing_bearer_token' })
  const tokenHash = await sha256Hex(token)

  const { data: link, error: linkErr } = await supabaseAdmin
    .from('handbot_link').select('id, user_id, account_login, api_key_revoked_at')
    .eq('api_key_hash', tokenHash).maybeSingle()

  if (linkErr) return jsonResponse(500, { error: 'internal_error' })
  if (!link) return jsonResponse(401, { error: 'invalid_token' })
  if (link.api_key_revoked_at) return jsonResponse(403, { error: 'token_revoked' })

  const { data: params, error: paramsErr } = await supabaseAdmin
    .from('handbot_params')
    .select(['needs_sync', ...PARAM_FIELDS, 'updated_at'].join(', '))
    .eq('handbot_link_id', link.id).maybeSingle()

  if (paramsErr) return jsonResponse(500, { error: 'params_fetch_failed' })
  if (!params) return jsonResponse(404, { error: 'params_not_found' })

  // ~99% das chamadas: sem mudança pendente → resposta mínima, sem UPDATE
  if (!params.needs_sync) return jsonResponse(200, { sync: false })

  // Havia mudança: zera o flag e devolve todos os parâmetros
  await supabaseAdmin.from('handbot_params')
    .update({ needs_sync: false }).eq('handbot_link_id', link.id)

  const out: Record<string, unknown> = { sync: true, updated_at: params.updated_at }
  for (const f of PARAM_FIELDS) out[f] = (params as Record<string, unknown>)[f]
  return jsonResponse(200, out)
}

// POST pelo usuário: salva/atualiza parâmetros (marca needs_sync = true)
async function handleUserPost(req: Request, userId: string): Promise<Response> {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'invalid_json' }) }

  const linkId = typeof body.link_id === 'string' ? body.link_id : null
  if (!linkId) return jsonResponse(400, { error: 'link_id_required' })

  // Confirma que o link pertence ao usuário
  const { data: link } = await supabaseAdmin
    .from('handbot_link').select('id')
    .eq('id', linkId).eq('user_id', userId).maybeSingle()
  if (!link) return jsonResponse(404, { error: 'link_not_found' })

  const updates: Record<string, unknown> = { user_id: userId, handbot_link_id: link.id }
  for (const field of PARAM_FIELDS) if (field in body) updates[field] = body[field]

  const { error: upsertErr } = await supabaseAdmin
    .from('handbot_params')
    .upsert({ ...updates, needs_sync: true }, { onConflict: 'handbot_link_id' })

  if (upsertErr) return jsonResponse(500, { error: 'save_failed' })
  return jsonResponse(200, { ok: true })
}

// GET pelo usuário: lista todos os links (múltiplas contas MT5)
async function handleUserLinkGet(userId: string): Promise<Response> {
  const { data: links, error } = await supabaseAdmin
    .from('handbot_link')
    .select('id, account_login, broker_display, api_key_prefix, api_key_created_at, api_key_revoked_at, created_at')
    .eq('user_id', userId).order('created_at', { ascending: true })
  if (error) return jsonResponse(500, { error: 'internal_error' })
  return jsonResponse(200, { links: links ?? [] })
}

// GET pelo usuário: params de um link específico (?link_id=)
async function handleUserParamsGet(req: Request, userId: string): Promise<Response> {
  const linkId = new URL(req.url).searchParams.get('link_id')
  if (!linkId) return jsonResponse(400, { error: 'link_id_required' })

  const { data: link } = await supabaseAdmin
    .from('handbot_link').select('id')
    .eq('id', linkId).eq('user_id', userId).maybeSingle()
  if (!link) return jsonResponse(200, { params: null })

  const { data: params, error } = await supabaseAdmin
    .from('handbot_params').select('*').eq('handbot_link_id', link.id).maybeSingle()
  if (error) return jsonResponse(500, { error: 'internal_error' })
  return jsonResponse(200, { params: params ?? null })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const action = new URL(req.url).pathname.split('/').filter(Boolean).pop()

  // GET sem JWT = EA
  if (req.method === 'GET' && action === 'link-id') return handleEaLinkId(req)
  if (req.method === 'GET' && action !== 'link' && action !== 'user-params') return handleEaGet(req)

  // Demais rotas exigem JWT do usuário
  const user = await getAuthedUser(req)
  if (!user) return jsonResponse(401, { error: 'unauthorized' })

  if (req.method === 'GET' && action === 'link') return handleUserLinkGet(user.id)
  if (req.method === 'GET' && action === 'user-params') return handleUserParamsGet(req, user.id)
  if (req.method === 'POST') return handleUserPost(req, user.id)

  return jsonResponse(405, { error: 'method_not_allowed' })
})
```

> **Diferença cosmética vs. produção:** a versão de referência lista os campos manualmente no `.select()` e monta a resposta campo a campo. Aqui usamos a constante `PARAM_FIELDS` para evitar repetição — o comportamento e o JSON de saída são idênticos. Se preferir, pode expandir manualmente.

---

## 7. Frontend

### 7.1 `lib/handbotLink.ts`

```ts
import { supabase } from './supabase';

// Wrappers para as edge functions handbot-link e handbot-params.

export interface HandbotConnectResponse {
  api_key: string;
  api_key_prefix: string;
}

export interface HandbotLink {
  id: string;
  account_login: number;
  broker_display: string | null;
  api_key_prefix: string;
  api_key_created_at: string;
  api_key_revoked_at: string | null;
  created_at: string;
}

export interface HandbotParams {
  trailing_avg_enabled: boolean;
  trailing_avg_distance: number;
  trailing_avg_stop: number;
  trailing_pts_enabled: boolean;
  trailing_pts_distance: number;
  trailing_pts_stop: number;
  break_even_avg_enabled: boolean;
  break_even_avg_distance: number;
  break_even_avg_gain: number;
  break_even_pts_enabled: boolean;
  break_even_pts_distance: number;
  break_even_pts_gain: number;
  add_points_enabled: boolean;
  add_points_lot: number;
  add_points_distance: number;
  add_points_avg_distance: number;
  // Grid à Favor (legado global)
  grid_ahead_enabled: boolean;
  grid_ahead_distance: number;
  grid_ahead_multiplier: number;
  // Grid à Favor - por lado
  grid_ahead_enabled_buy: boolean;
  grid_ahead_distance_buy: number;
  grid_ahead_multiplier_buy: number;
  grid_ahead_lot_buy: number;
  grid_ahead_enabled_sell: boolean;
  grid_ahead_distance_sell: number;
  grid_ahead_multiplier_sell: number;
  grid_ahead_lot_sell: number;
  // Grid Contra (legado global)
  grid_contra_enabled: boolean;
  grid_contra_lot: number;
  grid_contra_distance: number;
  grid_contra_multiplier: number;
  grid_contra_max_orders: number;
  // Grid Contra - por lado
  grid_contra_enabled_buy: boolean;
  grid_contra_lot_buy: number;
  grid_contra_distance_buy: number;
  grid_contra_multiplier_buy: number;
  grid_contra_enabled_sell: boolean;
  grid_contra_lot_sell: number;
  grid_contra_distance_sell: number;
  grid_contra_multiplier_sell: number;
  // Negociação Automática
  allow_buy: boolean;
  allow_sell: boolean;
  // Barra-a-Barra
  bar_folga_stop: number;
  bar_trailing_enabled: boolean;
  bar_timeframe: number;
  bar_refresh_entry: boolean;
  // Reset Global
  reset_value_to_add: number;
  // Hedge Dinâmico
  dynamic_hedge_enabled: boolean;
  dynamic_hedge_percent: number;
  // Operações Manuais
  include_manual_trades: boolean;
  updated_at?: string;
}

const FUNCTIONS_URL = (() => {
  const env = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env;
  const base = env?.VITE_SUPABASE_URL ?? '';
  return base.replace(/\/$/, '') + '/functions/v1';
})();

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not_authenticated');
  return token;
}

async function callHandbotLink<T>(
  action: 'connect' | 'rotate' | 'disconnect',
  body: Record<string, unknown> = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-link/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  let parsed: unknown = null;
  try { parsed = await res.json(); } catch { /* corpo vazio */ }

  if (!res.ok) {
    const message = parsed && typeof parsed === 'object' && 'error' in parsed
      ? String((parsed as { error: unknown }).error)
      : `http_${res.status}`;
    throw new Error(message);
  }
  return parsed as T;
}

export async function connectHandbot(
  accountLogin: number,
  brokerDisplay?: string,
): Promise<HandbotConnectResponse> {
  return callHandbotLink<HandbotConnectResponse>('connect', {
    account_login: accountLogin,
    broker_display: brokerDisplay,
  });
}

export async function rotateHandbotApiKey(linkId: string): Promise<HandbotConnectResponse> {
  return callHandbotLink<HandbotConnectResponse>('rotate', { link_id: linkId });
}

export async function disconnectHandbot(linkId: string): Promise<void> {
  await callHandbotLink<{ ok: true }>('disconnect', { link_id: linkId });
}

export async function fetchHandbotLinks(): Promise<HandbotLink[]> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-params/link`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.links ?? [];
}

export async function fetchHandbotParams(linkId: string): Promise<HandbotParams | null> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-params/user-params?link_id=${linkId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.params ?? null;
}

export async function saveHandbotParams(linkId: string, params: HandbotParams): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-params`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ...params, link_id: linkId }),
  });

  let parsed: unknown = null;
  try { parsed = await res.json(); } catch { /* corpo vazio */ }

  if (!res.ok) {
    const message = parsed && typeof parsed === 'object' && 'error' in parsed
      ? String((parsed as { error: unknown }).error)
      : `http_${res.status}`;
    throw new Error(message);
  }
}
```

### 7.2 `components/HandBot/HandBot.tsx`

Componente React único e auto-contido. Dependências: `react`, `lucide-react`, Tailwind CSS. Subcomponentes internos: `Toggle`, `NumericInput`, `SectionHeader`, `ConnectSection` (fluxo de conexão em 2 passos: conta → chave + instruções de instalação), `ManageSection` (rotacionar/desconectar), `ParamsForm` (formulário completo de parâmetros), `AccountSelector` (troca entre contas).

> **⚠️ Ajuste obrigatório de 2 constantes** no topo do arquivo:
> - `EA_DOWNLOAD_URL` — URL pública de download do EA (`.ex5`). No novo projeto, aponte para onde o binário do EA estiver hospedado (ex.: bucket público do Storage do novo projeto). Se ainda não houver, deixe um placeholder e avise o dono do projeto.
> - `SUPABASE_HOST` — já é derivado automaticamente de `VITE_SUPABASE_URL`; nenhum ajuste necessário desde que a env var esteja correta.

Cole o componente **na íntegra** (código abaixo):

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, Copy, Check, AlertTriangle, RefreshCw, X,
  ChevronDown, Download, Loader2, Save, Unplug, Plus, ChevronRight,
} from 'lucide-react';
import {
  connectHandbot, rotateHandbotApiKey, disconnectHandbot,
  fetchHandbotLinks, fetchHandbotParams, saveHandbotParams,
  type HandbotLink, type HandbotParams,
} from '../../lib/handbotLink';

interface HandBotProps {
  onBack: () => void;
}

const SUPABASE_HOST = (() => {
  try {
    const url = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
    return url ? new URL(url).origin : '';
  } catch { return ''; }
})();

// >>> AJUSTE: URL pública do EA .ex5 no novo projeto <<<
const EA_DOWNLOAD_URL = 'https://<SEU-PROJETO>.supabase.co/storage/v1/object/public/mt5-ea/HandBot.ex5';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

const DEFAULT_PARAMS: HandbotParams = {
  trailing_avg_enabled: true,
  trailing_avg_distance: 120,
  trailing_avg_stop: 100,
  trailing_pts_enabled: true,
  trailing_pts_distance: 220,
  trailing_pts_stop: 140,
  break_even_avg_enabled: true,
  break_even_avg_distance: 50,
  break_even_avg_gain: 20,
  break_even_pts_enabled: true,
  break_even_pts_distance: 30,
  break_even_pts_gain: 10,
  add_points_enabled: false,
  add_points_lot: 0.01,
  add_points_distance: 250,
  add_points_avg_distance: 300,
  grid_ahead_enabled: false,
  grid_ahead_distance: 550.0,
  grid_ahead_multiplier: 1.1,
  grid_ahead_enabled_buy: false,
  grid_ahead_distance_buy: 550.0,
  grid_ahead_multiplier_buy: 1.1,
  grid_ahead_lot_buy: 0.01,
  grid_ahead_enabled_sell: false,
  grid_ahead_distance_sell: 550.0,
  grid_ahead_multiplier_sell: 1.1,
  grid_ahead_lot_sell: 0.01,
  grid_contra_enabled: false,
  grid_contra_lot: 0.01,
  grid_contra_distance: 60.0,
  grid_contra_multiplier: 1.0,
  grid_contra_max_orders: 200,
  grid_contra_enabled_buy: false,
  grid_contra_lot_buy: 0.01,
  grid_contra_distance_buy: 60.0,
  grid_contra_multiplier_buy: 1.0,
  grid_contra_enabled_sell: false,
  grid_contra_lot_sell: 0.01,
  grid_contra_distance_sell: 60.0,
  grid_contra_multiplier_sell: 1.0,
  allow_buy: false,
  allow_sell: false,
  bar_folga_stop: 50,
  bar_trailing_enabled: false,
  bar_timeframe: 0,
  bar_refresh_entry: false,
  reset_value_to_add: 100,
  dynamic_hedge_enabled: false,
  dynamic_hedge_percent: 1.0,
  include_manual_trades: false,
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  checked, onChange, disabled,
}) => (
  <button
    type="button" role="switch" aria-checked={checked} disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-green-500' : 'bg-slate-300'
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
      checked ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
);

// ─── NumericInput ─────────────────────────────────────────────────────────────
const NumericInput: React.FC<{
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; disabled?: boolean; decimal?: boolean;
}> = ({ label, value, onChange, step = 1, min = 0, disabled, decimal }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm text-slate-600 flex-1">{label}</label>
    <input
      type="number" value={value} step={step} min={min} disabled={disabled}
      onChange={(e) => {
        const v = decimal ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        if (!isNaN(v)) onChange(v);
      }}
      className="w-28 text-right border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-white"
    />
  </div>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; enabled: boolean; onToggle: (v: boolean) => void; disabled?: boolean }> = ({
  title, enabled, onToggle, disabled,
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm font-bold text-slate-900">{title}</span>
    <Toggle checked={enabled} onChange={onToggle} disabled={disabled} />
  </div>
);

// ─── ConnectSection ───────────────────────────────────────────────────────────
const ConnectSection: React.FC<{ onConnected: (link: HandbotLink) => void }> = ({ onConnected }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [accountLogin, setAccountLogin] = useState('');
  const [broker, setBroker] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const handleConnect = async () => {
    setError(null);
    const login = accountLogin.trim();
    if (!/^\d{4,}$/.test(login)) {
      setError('Informe um número de conta válido (mínimo 4 dígitos).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await connectHandbot(Number(login), broker.trim() || undefined);
      setApiKey(res.api_key);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar chave.';
      if (msg === 'already_connected') setError('Já existe uma conexão ativa. Desconecte primeiro.');
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (text: string, which: 'key' | 'host') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'key') { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
      else { setCopiedHost(true); setTimeout(() => setCopiedHost(false), 2000); }
    } catch { /* ignorar */ }
  };

  const handleDone = async () => {
    const links = await fetchHandbotLinks();
    const latest = links[links.length - 1];
    if (latest) onConnected(latest);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs mb-4">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            Conta
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            Instalar EA
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Número da conta MT5 <span className="text-red-500">*</span>
              </label>
              <input
                type="text" inputMode="numeric" value={accountLogin}
                onChange={(e) => setAccountLogin(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="12345678"
              />
              <p className="text-xs text-slate-500 mt-1">Disponível no MT5 em Arquivo → Login.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Corretora (opcional)</label>
              <input
                type="text" value={broker} onChange={(e) => setBroker(e.target.value)} maxLength={60}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Ex: XP Investimentos"
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === 2 && apiKey && (
          <div className="space-y-4">
            <section className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">1</span>
                Sua chave de API
              </h4>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Esta chave será exibida apenas uma vez. Copie e guarde agora.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 break-all">{apiKey}</code>
                <button
                  onClick={() => copy(apiKey, 'key')}
                  className="shrink-0 px-3 py-2 bg-white border border-slate-300 hover:border-green-500 hover:text-green-600 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedKey ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
            </section>

            <section className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">2</span>
                Baixe o Expert Advisor
              </h4>
              <a
                href={EA_DOWNLOAD_URL} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={16} /> Baixar HandBot.ex5
              </a>
              <button
                onClick={() => setHowToOpen((v) => !v)}
                className="mt-3 text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1"
              >
                <ChevronDown size={14} className={`transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
                Como instalar no MT5
              </button>
              {howToOpen && (
                <ol className="mt-3 list-decimal pl-5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                  <li>Copie o arquivo para <code className="bg-slate-100 px-1 rounded">MQL5/Experts</code> (Arquivo → Abrir Pasta de Dados).</li>
                  <li>No Navegador do MT5 (Ctrl+N), clique direito em "Expert Advisors" → Atualizar.</li>
                  <li>Arraste <code className="bg-slate-100 px-1 rounded">HandBot</code> para o gráfico.</li>
                  <li>Na aba "Entradas", cole a chave em <code className="bg-slate-100 px-1 rounded">ApiKey</code>.</li>
                  <li>Confirme com OK. O EA passará a sincronizar parâmetros automaticamente.</li>
                </ol>
              )}
            </section>

            <section className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">3</span>
                Autorize a comunicação
              </h4>
              <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                No MT5: <strong>Ferramentas → Opções → Expert Advisors</strong>. Marque
                "Permitir WebRequest" e adicione o endereço abaixo.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 break-all">
                  {SUPABASE_HOST || 'https://<seu-projeto>.supabase.co'}
                </code>
                <button
                  onClick={() => copy(SUPABASE_HOST, 'host')}
                  className="shrink-0 px-3 py-2 bg-white border border-slate-300 hover:border-green-500 hover:text-green-600 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedHost ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="px-6 py-4 flex justify-between items-center">
        {step === 1 ? (
          <>
            <span />
            <button
              onClick={handleConnect} disabled={submitting || !accountLogin}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Gerando…' : 'Conectar'}
            </button>
          </>
        ) : (
          <>
            <span />
            <button
              onClick={handleDone}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Concluir
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── ManageSection ────────────────────────────────────────────────────────────
const ManageSection: React.FC<{
  link: HandbotLink;
  onDisconnected: () => void;
  onRotated: (link: HandbotLink) => void;
}> = ({ link, onDisconnected, onRotated }) => {
  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRotate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await rotateHandbotApiKey(link.id);
      setNewKey(res.api_key);
      setConfirmingRotate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar nova chave.');
    } finally { setBusy(false); }
  };

  const handleDisconnect = async () => {
    setBusy(true); setError(null);
    try {
      await disconnectHandbot(link.id);
      onDisconnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desconectar.');
      setBusy(false);
    }
  };

  const copyNewKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* ignorar */ }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h3 className="text-sm font-bold text-slate-900">Conexão MT5</h3>

      <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
        <dt className="text-slate-500">Conta MT5</dt>
        <dd className="font-mono text-slate-800">{link.account_login}</dd>
        {link.broker_display && (
          <>
            <dt className="text-slate-500">Corretora</dt>
            <dd className="text-slate-800">{link.broker_display}</dd>
          </>
        )}
        <dt className="text-slate-500">Conectado em</dt>
        <dd className="text-slate-800">{formatDateTime(link.created_at)}</dd>
        <dt className="text-slate-500">Chave</dt>
        <dd className="font-mono text-slate-600">
          {link.api_key_prefix}<span className="text-slate-400">••••••••</span>
        </dd>
      </dl>

      <hr className="border-slate-100" />

      {!newKey && !confirmingRotate && (
        <button
          onClick={() => setConfirmingRotate(true)} disabled={busy}
          className="text-sm font-semibold text-slate-700 hover:text-green-700 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Revogar e gerar nova chave
        </button>
      )}

      {confirmingRotate && !newKey && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            A chave atual deixará de funcionar. O EA vai parar de sincronizar até ser atualizado com a nova chave.
          </div>
          <div className="flex gap-2">
            <button onClick={handleRotate} disabled={busy}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50">
              {busy ? 'Gerando…' : 'Confirmar revogação'}
            </button>
            <button onClick={() => setConfirmingRotate(false)} disabled={busy} className="px-3 py-1.5 text-xs font-semibold text-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {newKey && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-green-800">Nova chave gerada. Copie agora.</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-green-200 rounded px-2 py-1.5 text-xs font-mono text-slate-700 break-all">{newKey}</code>
            <button onClick={copyNewKey}
              className="shrink-0 px-3 py-1.5 bg-white border border-slate-300 hover:border-green-500 hover:text-green-700 text-slate-700 rounded text-xs font-semibold flex items-center gap-1">
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
          <button
            onClick={async () => {
              setNewKey(null);
              const links = await fetchHandbotLinks();
              const updated = links.find((l) => l.id === link.id);
              if (updated) onRotated(updated);
            }}
            className="text-xs font-semibold text-green-700 hover:text-green-800"
          >
            Pronto, fechar
          </button>
        </div>
      )}

      <hr className="border-slate-100" />

      {!confirmingDisconnect ? (
        <button
          onClick={() => setConfirmingDisconnect(true)} disabled={busy}
          className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5"
        >
          <Unplug size={14} /> Desconectar do MT5
        </button>
      ) : (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
          <div className="text-xs text-red-800">Isso apaga o vínculo e os parâmetros salvos. Confirmar?</div>
          <div className="flex gap-2">
            <button onClick={handleDisconnect} disabled={busy}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50">
              {busy ? 'Desconectando…' : 'Confirmar'}
            </button>
            <button onClick={() => setConfirmingDisconnect(false)} disabled={busy} className="px-3 py-1.5 text-xs font-semibold text-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
};

// ─── ParamsForm ───────────────────────────────────────────────────────────────
const ParamsForm: React.FC<{
  linkId: string;
  initial: HandbotParams;
  onSaved: (params: HandbotParams) => void;
}> = ({ linkId, initial, onSaved }) => {
  const [params, setParams] = useState<HandbotParams>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof HandbotParams>(key: K, value: HandbotParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
    setDirty(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      await saveHandbotParams(linkId, params);
      setSaveSuccess(true);
      setDirty(false);
      onSaved(params);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Parâmetros do Hand Bot</h3>
        <p className="text-xs text-slate-500 mt-1">
          As alterações são enviadas ao EA na próxima sincronização automática.
        </p>
      </div>

      <div className="px-6 py-5 space-y-6 divide-y divide-slate-100">

        {/* Trailing Avg */}
        <div className="space-y-3">
          <SectionHeader title="Trailing Avg" enabled={params.trailing_avg_enabled} onToggle={(v) => set('trailing_avg_enabled', v)} />
          <div className={`space-y-3 pl-2 transition-opacity ${params.trailing_avg_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput label="Distância de ganho do preço médio para iniciar" value={params.trailing_avg_distance} onChange={(v) => set('trailing_avg_distance', v)} />
            <NumericInput label="Distância do stop para o preço atual" value={params.trailing_avg_stop} onChange={(v) => set('trailing_avg_stop', v)} />
          </div>
        </div>

        {/* Trailing Stop pts */}
        <div className="pt-4 space-y-3">
          <SectionHeader title="Trailing Stop pts" enabled={params.trailing_pts_enabled} onToggle={(v) => set('trailing_pts_enabled', v)} />
          <div className={`space-y-3 pl-2 transition-opacity ${params.trailing_pts_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput label="Distância de ganho do preço da ordem para iniciar" value={params.trailing_pts_distance} onChange={(v) => set('trailing_pts_distance', v)} />
            <NumericInput label="Distância do stop para o preço atual" value={params.trailing_pts_stop} onChange={(v) => set('trailing_pts_stop', v)} />
          </div>
        </div>

        {/* Break Even avg price */}
        <div className="pt-4 space-y-3">
          <SectionHeader title="Break Even avg price" enabled={params.break_even_avg_enabled} onToggle={(v) => set('break_even_avg_enabled', v)} />
          <div className={`space-y-3 pl-2 transition-opacity ${params.break_even_avg_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput label="Distância para ligar o Break Even" value={params.break_even_avg_distance} onChange={(v) => set('break_even_avg_distance', v)} />
            <NumericInput label="Margem de Ganho do Preço Médio (pontos)" value={params.break_even_avg_gain} onChange={(v) => set('break_even_avg_gain', v)} />
          </div>
        </div>

        {/* Break Even pts */}
        <div className="pt-4 space-y-3">
          <SectionHeader title="Break Even pts" enabled={params.break_even_pts_enabled} onToggle={(v) => set('break_even_pts_enabled', v)} />
          <div className={`space-y-3 pl-2 transition-opacity ${params.break_even_pts_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput label="Distância pra ligar o Break Even" value={params.break_even_pts_distance} onChange={(v) => set('break_even_pts_distance', v)} />
            <NumericInput label="Margem de gain (pontos)" value={params.break_even_pts_gain} onChange={(v) => set('break_even_pts_gain', v)} />
          </div>
        </div>

        {/* Add - Points */}
        <div className="pt-4 space-y-3">
          <SectionHeader title="Add - Points" enabled={params.add_points_enabled} onToggle={(v) => set('add_points_enabled', v)} />
          <div className={`space-y-3 pl-2 transition-opacity ${params.add_points_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput label="Lote Alavancagem" value={params.add_points_lot} onChange={(v) => set('add_points_lot', v)} step={0.01} min={0.01} decimal />
            <NumericInput label="Distância para iniciar" value={params.add_points_distance} onChange={(v) => set('add_points_distance', v)} />
            <NumericInput label="Distância para manter do preço médio" value={params.add_points_avg_distance} onChange={(v) => set('add_points_avg_distance', v)} />
          </div>
        </div>

        {/* Grid à Favor */}
        <div className="pt-4 space-y-3">
          <div className="py-1"><span className="text-sm font-bold text-slate-900">Grid à Favor</span></div>
          {/* Compra */}
          <div className="pl-2 space-y-3">
            <SectionHeader title="Compra" enabled={params.grid_ahead_enabled_buy} onToggle={(v) => set('grid_ahead_enabled_buy', v)} />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_ahead_enabled_buy ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput label="Lote base" value={params.grid_ahead_lot_buy} onChange={(v) => set('grid_ahead_lot_buy', v)} step={0.01} min={0.01} decimal />
              <NumericInput label="Distância inicial (pontos)" value={params.grid_ahead_distance_buy} onChange={(v) => set('grid_ahead_distance_buy', v)} step={0.5} min={0} decimal />
              <NumericInput label="Multiplicador de lote" value={params.grid_ahead_multiplier_buy} onChange={(v) => set('grid_ahead_multiplier_buy', v)} step={0.01} min={1} decimal />
            </div>
          </div>
          {/* Venda */}
          <div className="pl-2 space-y-3">
            <SectionHeader title="Venda" enabled={params.grid_ahead_enabled_sell} onToggle={(v) => set('grid_ahead_enabled_sell', v)} />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_ahead_enabled_sell ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput label="Lote base" value={params.grid_ahead_lot_sell} onChange={(v) => set('grid_ahead_lot_sell', v)} step={0.01} min={0.01} decimal />
              <NumericInput label="Distância inicial (pontos)" value={params.grid_ahead_distance_sell} onChange={(v) => set('grid_ahead_distance_sell', v)} step={0.5} min={0} decimal />
              <NumericInput label="Multiplicador de lote" value={params.grid_ahead_multiplier_sell} onChange={(v) => set('grid_ahead_multiplier_sell', v)} step={0.01} min={1} decimal />
            </div>
          </div>
        </div>

        {/* Grid Contra */}
        <div className="pt-4 space-y-3">
          <div className="py-1"><span className="text-sm font-bold text-slate-900">Grid Contra</span></div>
          {/* Compra */}
          <div className="pl-2 space-y-3">
            <SectionHeader title="Compra" enabled={params.grid_contra_enabled_buy} onToggle={(v) => set('grid_contra_enabled_buy', v)} />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_contra_enabled_buy ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput label="Lote base" value={params.grid_contra_lot_buy} onChange={(v) => set('grid_contra_lot_buy', v)} step={0.01} min={0.01} decimal />
              <NumericInput label="Distância entre ordens (pontos)" value={params.grid_contra_distance_buy} onChange={(v) => set('grid_contra_distance_buy', v)} step={0.5} min={0} decimal />
              <NumericInput label="Multiplicador de lote" value={params.grid_contra_multiplier_buy} onChange={(v) => set('grid_contra_multiplier_buy', v)} step={0.01} min={1} decimal />
            </div>
          </div>
          {/* Venda */}
          <div className="pl-2 space-y-3">
            <SectionHeader title="Venda" enabled={params.grid_contra_enabled_sell} onToggle={(v) => set('grid_contra_enabled_sell', v)} />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_contra_enabled_sell ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput label="Lote base" value={params.grid_contra_lot_sell} onChange={(v) => set('grid_contra_lot_sell', v)} step={0.01} min={0.01} decimal />
              <NumericInput label="Distância entre ordens (pontos)" value={params.grid_contra_distance_sell} onChange={(v) => set('grid_contra_distance_sell', v)} step={0.5} min={0} decimal />
              <NumericInput label="Multiplicador de lote" value={params.grid_contra_multiplier_sell} onChange={(v) => set('grid_contra_multiplier_sell', v)} step={0.01} min={1} decimal />
            </div>
          </div>
          {/* Máximo de ordens — compartilhado */}
          <div className="pl-2">
            <NumericInput label="Máximo de ordens" value={params.grid_contra_max_orders} onChange={(v) => set('grid_contra_max_orders', v)} min={1} />
          </div>
        </div>

        {/* Negociação Automática */}
        <div className="pt-4 space-y-3">
          <div className="py-1"><span className="text-sm font-bold text-slate-900">Negociação Automática</span></div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Negociação automática Long?</span>
            <Toggle checked={params.allow_buy} onChange={(v) => set('allow_buy', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Negociação automática Short?</span>
            <Toggle checked={params.allow_sell} onChange={(v) => set('allow_sell', v)} />
          </div>
        </div>

        {/* Atualização Barra-a-Barra */}
        <div className="pt-4 space-y-3">
          <div className="py-1"><span className="text-sm font-bold text-slate-900">Atualização Barra-a-Barra</span></div>
          <NumericInput label="Folga de stop (pontos)" value={params.bar_folga_stop} onChange={(v) => set('bar_folga_stop', v)} min={0} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Trailing Stop de Barra</span>
            <Toggle checked={params.bar_trailing_enabled} onChange={(v) => set('bar_trailing_enabled', v)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-600 flex-1">Timeframe da Barra</label>
            <select
              value={params.bar_timeframe}
              onChange={(e) => set('bar_timeframe', Number(e.target.value))}
              className="w-28 text-right border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value={0}>Atual</option>
              <option value={1}>M1</option>
              <option value={5}>M5</option>
              <option value={15}>M15</option>
              <option value={30}>M30</option>
              <option value={16385}>H1</option>
              <option value={16386}>H2</option>
              <option value={16387}>H3</option>
              <option value={16388}>H4</option>
              <option value={16390}>H6</option>
              <option value={16392}>H8</option>
              <option value={16396}>H12</option>
              <option value={16408}>D1</option>
              <option value={32769}>W1</option>
              <option value={49153}>MN1</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Atualizar Entrada</span>
            <Toggle checked={params.bar_refresh_entry} onChange={(v) => set('bar_refresh_entry', v)} />
          </div>
        </div>

        {/* Reset Global */}
        <div className="pt-4 space-y-3">
          <div className="py-1"><span className="text-sm font-bold text-slate-900">Reset Global</span></div>
          <NumericInput label="% de saldo para liquidar tudo (Cut Gain Dinâmico)" value={params.reset_value_to_add} onChange={(v) => set('reset_value_to_add', v)} step={0.01} min={0} decimal />
        </div>

        {/* Operações Manuais */}
        <div className="pt-4 space-y-3">
          <SectionHeader title="Tratar Operações Manuais" enabled={params.include_manual_trades} onToggle={(v) => set('include_manual_trades', v)} />
          <p className="text-xs text-slate-500 pl-2">
            Quando ligado, o trailing stop e break even também são aplicados em posições abertas manualmente (sem magic number do EA).
          </p>
        </div>

        {/* Hedge Dinâmico */}
        <div className="pt-4 space-y-3">
          <SectionHeader title="Hedge Dinâmico" enabled={params.dynamic_hedge_enabled} onToggle={(v) => set('dynamic_hedge_enabled', v)} />
          <div className={`space-y-3 pl-2 transition-opacity ${params.dynamic_hedge_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput label="% de flutuante para ativar" value={params.dynamic_hedge_percent} onChange={(v) => set('dynamic_hedge_percent', v)} step={0.1} min={0} decimal />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle size={15} /> {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check size={15} /> Parâmetros enviados com sucesso.
          </div>
        )}
        {!saveError && !saveSuccess && <span />}

        <button
          onClick={handleSave} disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : <><Save size={16} /> Enviar Alterações</>}
        </button>
      </div>
    </div>
  );
};

// ─── AccountSelector ──────────────────────────────────────────────────────────
const AccountSelector: React.FC<{
  links: HandbotLink[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}> = ({ links, activeId, onSelect, onAdd }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {links.map((l) => (
      <button
        key={l.id} onClick={() => onSelect(l.id)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          l.id === activeId
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-slate-700 border-slate-300 hover:border-green-500 hover:text-green-700'
        }`}
      >
        <span className="font-mono">{l.account_login}</span>
        {l.broker_display && <span className="opacity-75">· {l.broker_display}</span>}
        {l.id === activeId && <ChevronRight size={12} />}
      </button>
    ))}
    <button
      onClick={onAdd}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 text-slate-500 hover:border-green-500 hover:text-green-700 transition-colors bg-white"
    >
      <Plus size={12} /> Adicionar conta
    </button>
  </div>
);

// ─── HandBot (main) ───────────────────────────────────────────────────────────
export const HandBot: React.FC<HandBotProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<HandbotLink[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paramsMap, setParamsMap] = useState<Record<string, HandbotParams>>({});
  const [addingAccount, setAddingAccount] = useState(false);

  const activeLink = links.find((l) => l.id === activeId) ?? null;
  const activeParams = activeId ? (paramsMap[activeId] ?? null) : null;

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const ls = await fetchHandbotLinks();
      setLinks(ls);
      if (ls.length > 0) {
        const firstId = ls[0].id;
        setActiveId((prev) => prev && ls.find((l) => l.id === prev) ? prev : firstId);
        const entries = await Promise.all(
          ls.map(async (l) => [l.id, await fetchHandbotParams(l.id)] as const)
        );
        setParamsMap(Object.fromEntries(entries.filter(([, p]) => p !== null)) as Record<string, HandbotParams>);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-green-600" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Bot size={22} className="text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hand Bot</h1>
          <p className="text-sm text-slate-500">Controle remoto de parâmetros do Expert Advisor</p>
        </div>
      </div>

      {links.length === 0 && !addingAccount ? (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
            <p className="text-sm text-slate-600 font-medium">Nenhuma conta MT5 vinculada</p>
            <p className="text-xs text-slate-400">
              Conecte o Hand Bot à sua conta MT5 para poder ajustar os parâmetros remotamente.
            </p>
          </div>
          <ConnectSection onConnected={(l) => { loadLinks(); setActiveId(l.id); }} />
        </>
      ) : addingAccount ? (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddingAccount(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
          <ConnectSection
            onConnected={(l) => { setAddingAccount(false); loadLinks(); setActiveId(l.id); }}
          />
        </>
      ) : (
        <>
          {links.length > 0 && (
            <AccountSelector
              links={links} activeId={activeId!}
              onSelect={setActiveId} onAdd={() => setAddingAccount(true)}
            />
          )}

          {activeLink && (
            <>
              <ManageSection
                link={activeLink}
                onDisconnected={() => {
                  setParamsMap((m) => { const n = { ...m }; delete n[activeLink.id]; return n; });
                  loadLinks().then(() => {
                    setLinks((ls) => {
                      if (ls.length > 0) setActiveId(ls[0].id);
                      else setActiveId(null);
                      return ls;
                    });
                  });
                }}
                onRotated={(l) => setLinks((ls) => ls.map((x) => x.id === l.id ? l : x))}
              />
              <ParamsForm
                key={activeLink.id}
                linkId={activeLink.id}
                initial={activeParams ?? DEFAULT_PARAMS}
                onSaved={(p) => setParamsMap((m) => ({ ...m, [activeLink.id]: p }))}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};
```

---

## 8. Contrato com o EA (referência — NÃO precisa implementar nada aqui)

> Esta seção existe apenas para explicar **por que** os endpoints têm esse formato. O EA já existe e é mantido por outra pessoa. O implementador **não** mexe no EA e **não** precisa dele para concluir a feature. O único ponto de atenção operacional é garantir que os endpoints Supabase respondam no formato abaixo — o que o código das seções 5 e 6 já faz.

O EA chama três coisas no domínio do projeto Supabase:

1. **`GET /functions/v1/handbot-params/link-id`** com header `Authorization: Bearer <api_key>` → resposta `{ "link_id": "<uuid>" }`. O EA cacheia esse `link_id`.
2. **`GET /rest/v1/handbot_params?handbot_link_id=eq.<uuid>&select=needs_sync`** (PostgREST direto, com a **anon key** nos headers `apikey` e `Authorization: Bearer <anon_key>`) → resposta `[{ "needs_sync": true|false }]`. É por isso que existe a policy `handbot_params_anon_needs_sync` na migration. Barato: não consome invocação de edge function.
3. **`GET /functions/v1/handbot-params`** com header `Authorization: Bearer <api_key>` → se `needs_sync` estava `true`, devolve `{ "sync": true, ...todos os parâmetros }` e zera o flag; caso contrário devolve `{ "sync": false }`.

**Sobre a URL no EA:** o EA aponta para o domínio do projeto Supabase. Ao usar este mesmo EA num projeto novo, basta que **a URL do novo projeto** seja informada ao EA (via input/configuração do próprio EA) — isso é responsabilidade de quem mantém o EA, **fora do escopo desta implementação**. Do lado do dashboard/Supabase, nada muda: só é preciso que o projeto novo tenha as tabelas, policies e functions descritas aqui, e que a `handbot-params` esteja com **Verify JWT desligado**.

---

## 9. Checklist de validação (fim da implementação)

- [ ] Migration aplicada; tabelas `handbot_link` e `handbot_params` existem com RLS habilitado e a policy `handbot_params_anon_needs_sync` criada.
- [ ] Edge functions `handbot-link` e `handbot-params` deployadas.
- [ ] **`handbot-params` com Verify JWT = OFF** (senão o EA leva 401 antes do código rodar).
- [ ] `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` apontam para o novo projeto.
- [ ] `EA_DOWNLOAD_URL` no componente ajustado (ou placeholder sinalizado ao dono).
- [ ] Sessão "Hand Bot" acessível pelo menu.
- [ ] **Fluxo de conexão:** informar conta MT5 → recebe API Key (exibida uma vez) → passos de instalação aparecem → "Concluir" leva ao painel de parâmetros.
- [ ] **Tentar reconectar a mesma conta** → erro "Já existe uma conexão ativa" (409 `already_connected`).
- [ ] **Salvar parâmetros:** alterar um campo, "Enviar Alterações" → mensagem de sucesso. No banco, `handbot_params.needs_sync` vira `true` para aquele link.
- [ ] **Rotacionar chave:** gera nova chave, exibida uma vez; `api_key_prefix` muda no painel.
- [ ] **Desconectar:** remove o link e (por cascata) os parâmetros.
- [ ] **Múltiplas contas:** "Adicionar conta" cria segundo vínculo; o seletor alterna entre eles e cada um mantém seus próprios parâmetros.
- [ ] Recarregar a página mantém a lista de contas e os parâmetros salvos.

---

## 10. Notas finais para a IA implementadora

- **Fidelidade:** este é um port 1:1 de uma feature em produção. Não "melhore" o schema, os nomes de campos, os endpoints ou o formato das respostas — o EA depende deles exatamente como estão. Nomes de tabela (`handbot_link`, `handbot_params`), de colunas e o prefixo da chave (`txp_hbot_`) devem permanecer idênticos.
- **Estilo visual:** o componente usa Tailwind + `lucide-react` com paleta verde/slate. Se o novo projeto usa outra biblioteca de UI, você pode adaptar o visual, mas **mantenha a estrutura de estados e as chamadas às funções de `handbotLink.ts` intactas**.
- **`profiles`/admin:** a policy admin opcional (comentada na migration) só deve ser habilitada se o novo projeto tiver a tabela `public.profiles` com coluna `role`. Caso contrário, deixe comentada.
- **Timezone/locale:** as strings estão em pt-BR; ajuste se o novo público for outro.
```
