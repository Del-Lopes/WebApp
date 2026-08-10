-- ============================================================
-- Sessão Crypto — inteligência acumulada e lista do usuário.
--
-- 1) Snapshots diários de trending e de categorias/narrativas.
--    O CoinGecko só expõe "mais buscadas" em 24h e variação de setor em 24h.
--    Guardando um retrato por dia, passamos a responder o que a API não responde:
--    quantas vezes uma moeda apareceu no radar em 7/30 dias, e como um setor
--    evoluiu na janela. É dado proprietário — só existe se acumularmos.
--
-- 2) Watchlist do usuário (moedas acompanhadas).
--
-- Escrita dos snapshots: apenas service_role (edge function crypto-snapshot).
-- Leitura: qualquer usuário autenticado. Watchlist: só o dono.
-- Idempotente. Rodar via db push ou SQL Editor.
-- ============================================================

-- ─── Snapshot diário do trending (moedas mais buscadas) ─────────────────────

create table if not exists public.crypto_trending_snapshot (
  id              uuid primary key default gen_random_uuid(),
  snapshot_date   date not null default (now() at time zone 'utc')::date,
  coin_id         text not null,
  name            text not null,
  symbol          text not null,
  thumb           text,
  market_cap_rank integer,
  -- posição na lista do dia (1 = mais buscada); serve para ponderar relevância
  position        integer not null,
  created_at      timestamptz not null default now()
);

-- Um registro por moeda por dia — é o que torna a função de snapshot idempotente.
create unique index if not exists crypto_trending_snapshot_unique
  on public.crypto_trending_snapshot (snapshot_date, coin_id);

create index if not exists crypto_trending_snapshot_date_idx
  on public.crypto_trending_snapshot (snapshot_date desc);

-- ─── Snapshot diário das categorias (narrativas/setores) ────────────────────

create table if not exists public.crypto_category_snapshot (
  id             uuid primary key default gen_random_uuid(),
  snapshot_date  date not null default (now() at time zone 'utc')::date,
  category_id    text not null,
  name           text not null,
  market_cap     numeric,
  change_24h     numeric,
  volume_24h     numeric,
  created_at     timestamptz not null default now()
);

create unique index if not exists crypto_category_snapshot_unique
  on public.crypto_category_snapshot (snapshot_date, category_id);

create index if not exists crypto_category_snapshot_date_idx
  on public.crypto_category_snapshot (snapshot_date desc);

-- ─── RLS dos snapshots: leitura para autenticado, escrita só service_role ───

alter table public.crypto_trending_snapshot enable row level security;
alter table public.crypto_category_snapshot enable row level security;

drop policy if exists "crypto_trending_snapshot_read" on public.crypto_trending_snapshot;
create policy "crypto_trending_snapshot_read" on public.crypto_trending_snapshot
  for select to authenticated using (true);

drop policy if exists "crypto_category_snapshot_read" on public.crypto_category_snapshot;
create policy "crypto_category_snapshot_read" on public.crypto_category_snapshot
  for select to authenticated using (true);

-- Sem policy de insert/update/delete: só a edge function (service_role) escreve.

-- ─── Watchlist do usuário ───────────────────────────────────────────────────

create table if not exists public.crypto_watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  coin_id     text not null,
  symbol      text not null,
  name        text not null,
  image       text,
  created_at  timestamptz not null default now()
);

create unique index if not exists crypto_watchlist_unique
  on public.crypto_watchlist (user_id, coin_id);

create index if not exists crypto_watchlist_user_idx
  on public.crypto_watchlist (user_id, created_at desc);

alter table public.crypto_watchlist enable row level security;

drop policy if exists "crypto_watchlist_select_own" on public.crypto_watchlist;
create policy "crypto_watchlist_select_own" on public.crypto_watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "crypto_watchlist_insert_own" on public.crypto_watchlist;
create policy "crypto_watchlist_insert_own" on public.crypto_watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "crypto_watchlist_delete_own" on public.crypto_watchlist;
create policy "crypto_watchlist_delete_own" on public.crypto_watchlist
  for delete using (auth.uid() = user_id);

-- ─── Agregação: recorrência no trending numa janela de N dias ───────────────
--
-- Responde "quais moedas mais apareceram no radar nos últimos N dias".
-- days_seen é o sinal principal: aparecer 6 de 7 dias é persistência de
-- atenção; aparecer 1 vez é ruído. avg_position desempata (1 = topo da lista).
create or replace function public.crypto_trending_persistence(p_days integer default 7)
returns table (
  coin_id         text,
  name            text,
  symbol          text,
  thumb           text,
  market_cap_rank integer,
  days_seen       integer,
  avg_position    numeric,
  last_seen       date
)
language sql stable security definer set search_path = public as $$
  select
    s.coin_id,
    max(s.name)                        as name,
    max(s.symbol)                      as symbol,
    max(s.thumb)                       as thumb,
    max(s.market_cap_rank)             as market_cap_rank,
    count(distinct s.snapshot_date)::int as days_seen,
    round(avg(s.position), 1)          as avg_position,
    max(s.snapshot_date)               as last_seen
  from public.crypto_trending_snapshot s
  where s.snapshot_date > ((now() at time zone 'utc')::date - greatest(p_days, 1))
  group by s.coin_id
  order by days_seen desc, avg_position asc
  limit 30;
$$;

revoke all on function public.crypto_trending_persistence(integer) from public;
grant execute on function public.crypto_trending_persistence(integer) to authenticated;

-- ─── Agregação: quantos dias de histórico já temos ─────────────────────────
--
-- O front usa isso para saber se já pode mostrar a janela pedida ou se ainda
-- está acumulando (e nesse caso explicar em vez de mostrar lista vazia).
create or replace function public.crypto_snapshot_coverage()
returns table (days_available integer, first_date date, last_date date)
language sql stable security definer set search_path = public as $$
  select
    count(distinct snapshot_date)::int as days_available,
    min(snapshot_date)                 as first_date,
    max(snapshot_date)                 as last_date
  from public.crypto_trending_snapshot;
$$;

revoke all on function public.crypto_snapshot_coverage() from public;
grant execute on function public.crypto_snapshot_coverage() to authenticated;

-- ─── Agregação: evolução de um setor na janela ─────────────────────────────
--
-- Soma as variações diárias capturadas do setor (aproximação de acumulado) e
-- devolve o cap mais recente. Não é retorno composto exato — é o melhor que
-- dá para reconstruir a partir de leituras diárias de variação de 24h.
create or replace function public.crypto_category_trend(p_days integer default 7)
returns table (
  category_id   text,
  name          text,
  market_cap    numeric,
  sum_change    numeric,
  days_seen     integer
)
language sql stable security definer set search_path = public as $$
  with janela as (
    select *
      from public.crypto_category_snapshot
     where snapshot_date > ((now() at time zone 'utc')::date - greatest(p_days, 1))
  ),
  ultimo as (
    select distinct on (category_id) category_id, market_cap
      from janela
     order by category_id, snapshot_date desc
  )
  select
    j.category_id,
    max(j.name)                          as name,
    max(u.market_cap)                    as market_cap,
    round(sum(j.change_24h)::numeric, 2) as sum_change,
    count(distinct j.snapshot_date)::int as days_seen
  from janela j
  join ultimo u on u.category_id = j.category_id
  group by j.category_id
  order by sum_change desc
  limit 40;
$$;

revoke all on function public.crypto_category_trend(integer) from public;
grant execute on function public.crypto_category_trend(integer) to authenticated;
