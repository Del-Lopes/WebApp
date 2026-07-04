-- ============================================================
-- (A) Painel de Tendência Multi-TF — cobrança por abrir um ativo.
--     O cálculo roda no browser do cliente; o backend só cobra Coins
--     ao abrir um ativo pela 1ª vez NO DIA (mesmo ativo/mesmo dia = grátis).
--
-- (B) Atribuição manual de Coins pelo admin (para testes) — RPC
--     SECURITY DEFINER que valida que o chamador é admin, credita
--     trilha_stats.total_xp e registra em log de auditoria.
--
-- Coins = trilha_stats.total_xp (mesma moeda da Trilha Gain / Sinais).
-- Idempotente. Rodar via db push ou SQL Editor.
-- ============================================================

-- ─── (A) Painel de tendência ─────────────────────────────────────────────────

-- Custo de abrir o painel de um ativo (editável por admin em signal_config).
insert into public.signal_config (key, value) values ('trend_panel_cost', 200)
  on conflict (key) do nothing;

-- Registro de acessos: 1 linha por (usuário, símbolo, dia). O UNIQUE garante
-- que o mesmo ativo no mesmo dia não é cobrado duas vezes.
create table if not exists public.trend_panel_access (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  symbol      text not null,
  access_day  date not null default (now() at time zone 'utc')::date,
  coins_spent integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, symbol, access_day)
);
create index if not exists trend_panel_access_user_idx
  on public.trend_panel_access (user_id, access_day desc);

alter table public.trend_panel_access enable row level security;

-- O dono lê os próprios acessos (o front usa para saber o que já está liberado hoje).
drop policy if exists "trend_panel_access_select_own" on public.trend_panel_access;
create policy "trend_panel_access_select_own" on public.trend_panel_access
  for select using (auth.uid() = user_id);
-- Sem policy de INSERT direto: só a RPC (SECURITY DEFINER) grava.

-- RPC: abre (libera) o painel de um ativo. Cobra Coins só na 1ª vez do dia.
-- Retorna o novo saldo. Idempotente no dia: reabrir o mesmo ativo não cobra.
-- Erros: 'not_authenticated', 'insufficient_coins'.
create or replace function public.open_trend_panel(p_symbol text)
returns integer            -- novo saldo (total_xp)
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_cost integer;
  v_xp   integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_symbol is null or length(trim(p_symbol)) = 0 then raise exception 'invalid_symbol'; end if;

  -- Já abriu este ativo hoje? então não cobra (idempotente no dia).
  if exists (
    select 1 from trend_panel_access
    where user_id = v_uid and symbol = p_symbol and access_day = v_today
  ) then
    return (select total_xp from trilha_stats where user_id = v_uid);
  end if;

  select value into v_cost from signal_config where key = 'trend_panel_cost';
  if v_cost is null then v_cost := 200; end if;

  select total_xp into v_xp from trilha_stats where user_id = v_uid for update;
  if v_xp is null or v_xp < v_cost then
    raise exception 'insufficient_coins';
  end if;

  update trilha_stats set total_xp = total_xp - v_cost where user_id = v_uid;

  insert into trend_panel_access (user_id, symbol, access_day, coins_spent)
  values (v_uid, p_symbol, v_today, v_cost)
  on conflict (user_id, symbol, access_day) do nothing;

  return v_xp - v_cost;
end $$;

revoke all on function public.open_trend_panel(text) from public;
grant execute on function public.open_trend_panel(text) to authenticated;

-- ─── (B) Atribuição manual de Coins pelo admin ───────────────────────────────

-- Log de auditoria de créditos/débitos manuais feitos por admin.
create table if not exists public.admin_coin_grants (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references auth.users(id) on delete set null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       integer not null,           -- positivo credita, negativo debita
  balance_after integer not null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists admin_coin_grants_user_idx
  on public.admin_coin_grants (user_id, created_at desc);

alter table public.admin_coin_grants enable row level security;
-- Só staff lê o log.
drop policy if exists "admin_coin_grants_staff_select" on public.admin_coin_grants;
create policy "admin_coin_grants_staff_select" on public.admin_coin_grants
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'first_mate'))
  );

-- RPC: credita (ou debita, se amount<0) Coins a um usuário. Só admin.
-- Cria a linha de trilha_stats se o usuário ainda não tiver (UNIQUE user_id).
-- Nunca deixa o saldo negativo. Retorna o novo saldo.
-- Erros: 'not_authenticated', 'forbidden', 'invalid_amount', 'user_not_found'.
create or replace function public.admin_grant_coins(
  p_user_id uuid, p_amount integer, p_note text default null)
returns integer            -- novo saldo do usuário alvo
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_new   integer;
begin
  if v_admin is null then raise exception 'not_authenticated'; end if;

  -- CRÍTICO: SECURITY DEFINER ignora RLS — validamos o admin no corpo,
  -- senão qualquer authenticated poderia se auto-creditar.
  if not exists (select 1 from profiles where id = v_admin and role = 'admin') then
    raise exception 'forbidden';
  end if;

  if p_amount is null or p_amount = 0 then raise exception 'invalid_amount'; end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'user_not_found';
  end if;

  -- Upsert do saldo: cria a linha se não existir, senão soma (com piso em 0).
  insert into trilha_stats (user_id, total_xp, current_streak, best_streak)
  values (p_user_id, greatest(p_amount, 0), 0, 0)
  on conflict (user_id) do update
    set total_xp = greatest(trilha_stats.total_xp + p_amount, 0)
  returning total_xp into v_new;

  insert into admin_coin_grants (admin_id, user_id, amount, balance_after, note)
  values (v_admin, p_user_id, p_amount, v_new, p_note);

  return v_new;
end $$;

revoke all on function public.admin_grant_coins(uuid, integer, text) from public;
grant execute on function public.admin_grant_coins(uuid, integer, text) to authenticated;
