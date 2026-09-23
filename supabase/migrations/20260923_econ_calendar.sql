-- ============================================================
-- Sessão Calendário Econômico — eventos de 2 e 3 estrelas + interpretação.
--
-- 1) econ_calendar_event: uma linha por divulgação (occurrence) coletada do
--    Investing.com. Atual/projeção/anterior são atualizados a cada sync, então
--    o "atual" aparece minutos depois da divulgação.
--
-- 2) econ_event_profile: uma linha por INDICADOR (event_id). Guarda a descrição
--    do Investing e a interpretação gerada pela IA — contexto e cenários
--    (acima/abaixo/em linha do esperado). Um indicador se repete todo mês, então
--    a interpretação é gerada uma vez e reaproveitada por todas as divulgações
--    e por todos os usuários.
--
-- 3) econ_calendar_sync: trava global de frequência. O sync é chamado pelo cron
--    e pelo app ao abrir a sessão; a trava impede martelar a fonte.
--
-- Escrita: apenas service_role (edge econ-calendar-sync).
-- Leitura: qualquer usuário autenticado.
-- Idempotente. Rodar via db push ou SQL Editor.
-- ============================================================

-- ─── Perfil do indicador (descrição + interpretação IA) ─────────────────────

create table if not exists public.econ_event_profile (
  event_id        integer primary key,
  title           text not null,
  currency        text not null,
  country_id      integer,
  category        text,
  event_type      text,             -- 'speech' | 'report' | 'pmi' | null (dado numérico)
  importance      smallint not null, -- 2 ou 3 estrelas
  description     text,
  source          text,
  source_url      text,
  page_link       text,
  -- Polaridade observada no próprio Investing: 1 = leitura acima da projeção
  -- foi classificada como positiva para a moeda; -1 = negativa; null = ainda
  -- não observada. Alimenta o prompt da IA como verdade de referência.
  polarity        smallint,
  interpretation  jsonb,
  interpreted_at  timestamptz,
  interpret_error text,
  updated_at      timestamptz not null default now()
);

-- ─── Divulgações ────────────────────────────────────────────────────────────

create table if not exists public.econ_calendar_event (
  occurrence_id       bigint primary key,
  event_id            integer not null references public.econ_event_profile(event_id) on delete cascade,
  occurs_at           timestamptz not null,
  currency            text not null,
  title               text not null,
  importance          smallint not null,
  unit                text,
  precision           smallint,
  reference_period    text,
  preliminary         boolean not null default false,
  actual              numeric,
  forecast            numeric,
  previous            numeric,
  -- classificação do Investing: 'positive' | 'negative' | 'neutral'
  actual_to_forecast  text,
  revised_to_previous text,
  updated_at          timestamptz not null default now()
);

create index if not exists econ_calendar_event_time_idx
  on public.econ_calendar_event (occurs_at);

create index if not exists econ_calendar_event_history_idx
  on public.econ_calendar_event (event_id, occurs_at desc);

-- ─── Trava de frequência do sync ────────────────────────────────────────────

create table if not exists public.econ_calendar_sync (
  id           smallint primary key default 1 check (id = 1),
  last_run_at  timestamptz not null default 'epoch',
  last_ok_at   timestamptz,
  last_error   text
);

insert into public.econ_calendar_sync (id) values (1) on conflict (id) do nothing;

-- Reivindica a execução de forma atômica: só um chamador por janela passa.
-- Evita duas execuções simultâneas (cron + app) buscando e interpretando o
-- mesmo lote.
create or replace function public.econ_calendar_claim_sync(p_min_seconds integer default 60)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_claimed boolean;
begin
  update public.econ_calendar_sync
     set last_run_at = now()
   where id = 1
     and last_run_at < now() - make_interval(secs => greatest(p_min_seconds, 10))
  returning true into v_claimed;
  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.econ_calendar_claim_sync(integer) from public, anon, authenticated;
grant execute on function public.econ_calendar_claim_sync(integer) to service_role;

-- ─── RLS: leitura para autenticado, escrita só service_role ─────────────────

alter table public.econ_event_profile  enable row level security;
alter table public.econ_calendar_event enable row level security;
alter table public.econ_calendar_sync  enable row level security;

drop policy if exists "econ_event_profile_read" on public.econ_event_profile;
create policy "econ_event_profile_read" on public.econ_event_profile
  for select to authenticated using (true);

drop policy if exists "econ_calendar_event_read" on public.econ_calendar_event;
create policy "econ_calendar_event_read" on public.econ_calendar_event
  for select to authenticated using (true);

drop policy if exists "econ_calendar_sync_read" on public.econ_calendar_sync;
create policy "econ_calendar_sync_read" on public.econ_calendar_sync
  for select to authenticated using (true);

-- Sem policy de insert/update/delete: só a edge function (service_role) escreve.
