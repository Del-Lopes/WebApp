-- ============================================================
-- Sessão Crypto — calendário de desbloqueio de tokens (unlocks).
--
-- Desbloqueio de vesting é um dos maiores motores de queda em cripto e quase
-- nenhum app de varejo mostra: no dia em que um lote sai do cofre, a oferta
-- aumenta e o preço costuma sentir. Diferente de preço, o cronograma é
-- determinístico e conhecido com antecedência.
--
-- Fonte: bucket público de datasets do DefiLlama (defillama-datasets.llama.fi),
-- que é gratuito — a API /emissions do mesmo serviço é paga.
--
-- Cada arquivo de protocolo tem ~1 MB, e há ~370 protocolos. Por isso não
-- consultamos na hora: a edge function crypto-unlocks processa um lote rotativo
-- por execução e guarda aqui apenas o próximo evento de cada protocolo.
-- Cronograma de vesting muda raramente, então revisitar de tempos em tempos
-- basta — e a leitura no app fica instantânea.
--
-- Escrita: apenas service_role. Leitura: usuário autenticado.
-- Idempotente. Rodar via db push ou SQL Editor.
-- ============================================================

create table if not exists public.crypto_unlock (
  protocol_slug        text primary key,
  name                 text not null,
  -- id do CoinGecko, extraído de metadata.token ("coingecko:aptos").
  -- É o que permite cruzar com a watchlist e com as cotações.
  gecko_id             text,
  next_unlock_at       timestamptz,
  next_unlock_tokens   numeric,
  next_unlock_category text,
  -- 'cliff' (lote de uma vez) ou 'linear' (liberação contínua)
  next_unlock_type     text,
  max_supply           numeric,
  adjusted_supply      numeric,
  refreshed_at         timestamptz not null default now()
);

-- Ordena o calendário e sustenta a busca por moeda acompanhada.
create index if not exists crypto_unlock_next_idx
  on public.crypto_unlock (next_unlock_at)
  where next_unlock_at is not null;

create index if not exists crypto_unlock_gecko_idx
  on public.crypto_unlock (gecko_id)
  where gecko_id is not null;

-- Fila do lote rotativo: os menos atualizados entram primeiro.
create index if not exists crypto_unlock_refreshed_idx
  on public.crypto_unlock (refreshed_at);

alter table public.crypto_unlock enable row level security;

drop policy if exists "crypto_unlock_read" on public.crypto_unlock;
create policy "crypto_unlock_read" on public.crypto_unlock
  for select to authenticated using (true);

-- Sem policy de escrita: só a edge function (service_role) grava.

-- ─── Próximos desbloqueios ──────────────────────────────────────────────────
--
-- Só eventos futuros, do mais próximo ao mais distante. dilution_pct estima o
-- peso do lote sobre o supply já em circulação — é o número que diz se o
-- desbloqueio é relevante ou irrelevante para aquele token.
create or replace function public.crypto_upcoming_unlocks(p_days integer default 30)
returns table (
  protocol_slug        text,
  name                 text,
  gecko_id             text,
  next_unlock_at       timestamptz,
  next_unlock_tokens   numeric,
  next_unlock_category text,
  next_unlock_type     text,
  dilution_pct         numeric
)
language sql stable security definer set search_path = public as $$
  select
    u.protocol_slug,
    u.name,
    u.gecko_id,
    u.next_unlock_at,
    u.next_unlock_tokens,
    u.next_unlock_category,
    u.next_unlock_type,
    case
      when coalesce(u.adjusted_supply, 0) > 0
        then round((u.next_unlock_tokens / u.adjusted_supply * 100)::numeric, 2)
      else null
    end as dilution_pct
  from public.crypto_unlock u
  where u.next_unlock_at is not null
    and u.next_unlock_at >= now()
    and u.next_unlock_at <= now() + make_interval(days => greatest(p_days, 1))
    and coalesce(u.next_unlock_tokens, 0) > 0
  order by u.next_unlock_at asc
  limit 50;
$$;

revoke all on function public.crypto_upcoming_unlocks(integer) from public;
grant execute on function public.crypto_upcoming_unlocks(integer) to authenticated;

-- ─── Cobertura da varredura ────────────────────────────────────────────────
--
-- Quantos protocolos já foram processados. O front usa para avisar que o
-- calendário ainda está sendo montado, em vez de sugerir que não há unlocks.
create or replace function public.crypto_unlock_coverage()
returns table (protocols integer, with_future integer, oldest_refresh timestamptz)
language sql stable security definer set search_path = public as $$
  select
    count(*)::int                                                          as protocols,
    count(*) filter (where next_unlock_at >= now())::int                   as with_future,
    min(refreshed_at)                                                      as oldest_refresh
  from public.crypto_unlock;
$$;

revoke all on function public.crypto_unlock_coverage() from public;
grant execute on function public.crypto_unlock_coverage() to authenticated;
