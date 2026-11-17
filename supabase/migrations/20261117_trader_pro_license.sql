-- ============================================================
-- Trader Pro (extensão de navegador): licenças, dispositivos e diário automático.
--
-- Modelo:
--   ext_licenses       1 licença por usuário/produto (plano, validade, recursos liberados, limite de dispositivos).
--   ext_devices        cada instalação ativada. Guarda só o HASH do token do dispositivo; revogável.
--   ext_pairing_codes  código curto (10 min, uso único) que o usuário gera logado no WebApp e digita na extensão.
--   ext_license_events trilha de auditoria (ativações, recusas, revogações) — base para detectar compartilhamento.
--   trade_journal      ganha colunas para trades enviados pela extensão (idempotente por source+external_id).
--
-- Segurança (mesmo padrão da auditoria 20260926): RLS ligada; o usuário só LÊ o que é dele e a equipe lê tudo;
-- NENHUMA escrita por usuário — tudo passa pelas edge functions (service_role). anon não enxerga nada.
-- Rodar INTEIRO no SQL Editor (transação única). Idempotente.
-- ============================================================

begin;

-- ─── 1. Licenças ─────────────────────────────────────────────────────────────
create table if not exists public.ext_licenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  product      text not null default 'trader_pro' check (product in ('trader_pro')),
  plan         text not null default 'standard' check (plan in ('trial', 'standard', 'pro', 'lifetime')),
  status       text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  -- recursos liberados na extensão (a extensão ignora nomes que não conhece)
  features     text[] not null default array['execution','orderFlow','autoBe','autoStop','macros','journalSync']::text[],
  max_devices  smallint not null default 2 check (max_devices between 1 and 10),
  starts_at    timestamptz not null default now(),
  expires_at   timestamptz,                         -- null = sem validade
  source       text not null default 'admin' check (source in ('admin', 'coins', 'purchase', 'trial', 'partner')),
  notes        text check (char_length(notes) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, product)
);

create index if not exists ext_licenses_status_idx on public.ext_licenses (status, expires_at);

-- ─── 2. Dispositivos ─────────────────────────────────────────────────────────
create table if not exists public.ext_devices (
  id             uuid primary key default gen_random_uuid(),
  license_id     uuid not null references public.ext_licenses(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  token_hash     text not null unique,              -- sha256 do token do dispositivo (o texto puro só vai ao navegador, uma vez)
  label          text check (char_length(label) <= 60),
  ext_version    text check (char_length(ext_version) <= 20),
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  last_ip_hash   text,
  revoked_at     timestamptz,
  revoke_reason  text check (char_length(revoke_reason) <= 120)
);

create index if not exists ext_devices_license_idx on public.ext_devices (license_id) where revoked_at is null;
create index if not exists ext_devices_user_idx on public.ext_devices (user_id);

-- ─── 3. Códigos de pareamento ────────────────────────────────────────────────
create table if not exists public.ext_pairing_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_hash   text not null unique,                 -- sha256 do código normalizado
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists ext_pairing_codes_user_idx on public.ext_pairing_codes (user_id, created_at desc);

-- ─── 4. Auditoria ────────────────────────────────────────────────────────────
create table if not exists public.ext_license_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  license_id  uuid references public.ext_licenses(id) on delete set null,
  device_id   uuid references public.ext_devices(id) on delete set null,
  kind        text not null check (char_length(kind) <= 40),   -- pair, activate, activate_denied, refresh_denied, revoke, deactivate, ingest...
  detail      text check (char_length(detail) <= 200),
  ip_hash     text,
  created_at  timestamptz not null default now()
);

create index if not exists ext_license_events_user_idx on public.ext_license_events (user_id, created_at desc);
create index if not exists ext_license_events_ip_idx on public.ext_license_events (ip_hash, created_at desc) where ip_hash is not null;

-- ─── 5. updated_at ───────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ext_licenses_set_updated_at on public.ext_licenses;
create trigger ext_licenses_set_updated_at before update on public.ext_licenses
  for each row execute function public.set_updated_at();

-- ─── 6. RLS: leitura do próprio (ou equipe), nenhuma escrita direta ──────────
alter table public.ext_licenses       enable row level security;
alter table public.ext_devices        enable row level security;
alter table public.ext_pairing_codes  enable row level security;
alter table public.ext_license_events enable row level security;

drop policy if exists "ext_licenses_select_own_or_staff" on public.ext_licenses;
create policy "ext_licenses_select_own_or_staff" on public.ext_licenses
  for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- Equipe gerencia licenças pelo painel (conceder/suspender/revogar). O usuário nunca escreve.
drop policy if exists "ext_licenses_staff_write" on public.ext_licenses;
create policy "ext_licenses_staff_write" on public.ext_licenses
  for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "ext_devices_select_own_or_staff" on public.ext_devices;
create policy "ext_devices_select_own_or_staff" on public.ext_devices
  for select to authenticated using (user_id = auth.uid() or public.is_staff());

drop policy if exists "ext_license_events_select_own_or_staff" on public.ext_license_events;
create policy "ext_license_events_select_own_or_staff" on public.ext_license_events
  for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- ext_pairing_codes: sem policy nenhuma = ninguém lê/escreve fora do service_role.

revoke all on public.ext_licenses, public.ext_devices, public.ext_pairing_codes, public.ext_license_events from anon;
revoke insert, update, delete on public.ext_devices, public.ext_pairing_codes, public.ext_license_events from authenticated;

-- ─── 7. Diário: trades enviados pela extensão ────────────────────────────────
alter table public.trade_journal add column if not exists source        text check (char_length(source) <= 30);
alter table public.trade_journal add column if not exists external_id   text check (char_length(external_id) <= 120);
alter table public.trade_journal add column if not exists fees          numeric(18, 2);
alter table public.trade_journal add column if not exists is_estimated  boolean not null default false;
alter table public.trade_journal add column if not exists platform      text check (char_length(platform) <= 40);

-- Mesmo trade nunca entra duas vezes (a extensão reenvia sem medo). NULL em external_id = lançamento manual, sem restrição.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'trade_journal_external_uniq') then
    alter table public.trade_journal add constraint trade_journal_external_uniq unique (user_id, source, external_id);
  end if;
end $$;

commit;
