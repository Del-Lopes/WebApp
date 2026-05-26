-- Hand Bot: tabela de vínculo e parâmetros do EA
-- handbot_link: token de autenticação (mesmo padrão do strategy_mt5_link)
-- handbot_params: parâmetros configuráveis pelo usuário, lidos pelo EA via poll

-- ─── handbot_link ────────────────────────────────────────────────────────────
create table if not exists public.handbot_link (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  account_login    bigint not null,
  broker_display   text,
  api_key_hash     text not null unique,
  api_key_prefix   text not null,
  api_key_created_at timestamptz not null default now(),
  api_key_revoked_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Cada usuário pode ter no máximo um Hand Bot vinculado por conta
create unique index if not exists handbot_link_user_account_idx
  on public.handbot_link (user_id, account_login);

-- ─── handbot_params ──────────────────────────────────────────────────────────
-- Uma linha por usuário, com todos os parâmetros configuráveis do EA.
-- O EA faz GET /handbot-params com Bearer token para ler; o usuário faz POST
-- via webapp para gravar.
create table if not exists public.handbot_params (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  handbot_link_id            uuid not null references public.handbot_link(id) on delete cascade,

  -- Trailing Avg
  trailing_avg_enabled       boolean not null default true,
  trailing_avg_distance      integer not null default 120,
  trailing_avg_stop          integer not null default 100,

  -- Trailing Stop pts
  trailing_pts_enabled       boolean not null default true,
  trailing_pts_distance      integer not null default 220,
  trailing_pts_stop          integer not null default 140,

  -- Break Even avg price
  break_even_avg_enabled     boolean not null default true,
  break_even_avg_distance    integer not null default 50,
  break_even_avg_gain        integer not null default 20,

  -- Break Even pts
  break_even_pts_enabled     boolean not null default true,
  break_even_pts_distance    integer not null default 30,
  break_even_pts_gain        integer not null default 10,

  -- Add - Points
  add_points_enabled         boolean not null default false,
  add_points_lot             numeric(10,2) not null default 0.01,
  add_points_distance        integer not null default 250,
  add_points_avg_distance    integer not null default 300,

  updated_at                 timestamptz not null default now(),
  created_at                 timestamptz not null default now(),

  unique (user_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.handbot_link  enable row level security;
alter table public.handbot_params enable row level security;

-- handbot_link: usuário vê/gerencia apenas seus próprios links
create policy "handbot_link_owner_select" on public.handbot_link
  for select using (auth.uid() = user_id);

create policy "handbot_link_owner_insert" on public.handbot_link
  for insert with check (auth.uid() = user_id);

create policy "handbot_link_owner_update" on public.handbot_link
  for update using (auth.uid() = user_id);

create policy "handbot_link_owner_delete" on public.handbot_link
  for delete using (auth.uid() = user_id);

-- admins também podem ver todos os links
create policy "handbot_link_admin_select" on public.handbot_link
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'first_mate')
    )
  );

-- handbot_params: somente o dono lê/escreve (service_role bypassa para a edge fn)
create policy "handbot_params_owner_select" on public.handbot_params
  for select using (auth.uid() = user_id);

create policy "handbot_params_owner_insert" on public.handbot_params
  for insert with check (auth.uid() = user_id);

create policy "handbot_params_owner_update" on public.handbot_params
  for update using (auth.uid() = user_id);

-- ─── updated_at automático ───────────────────────────────────────────────────
create or replace function public.handbot_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handbot_link_updated_at
  before update on public.handbot_link
  for each row execute function public.handbot_set_updated_at();

create trigger handbot_params_updated_at
  before update on public.handbot_params
  for each row execute function public.handbot_set_updated_at();
