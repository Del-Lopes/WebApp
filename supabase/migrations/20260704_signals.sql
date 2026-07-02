-- Sessão Sinais — sinais de compra/venda (XAU/USD e futuros símbolos).
-- Duas origens (source):
--   'auto'  → gerados pela edge function signals-generate (estratégia própria)
--   'setup' → sinais do setup manual do time (inseridos por admin/painel)
--
-- Leitura: qualquer usuário autenticado.
-- Escrita: admin (via webapp) ou service_role (edge function bypassa RLS).

create table if not exists public.signals (
  id            uuid primary key default gen_random_uuid(),
  source        text not null default 'auto' check (source in ('auto', 'setup')),
  symbol        text not null default 'XAUUSD',
  -- 'BUY' = compra, 'SELL' = venda
  action        text not null check (action in ('BUY', 'SELL')),
  entry_price   numeric(18,5) not null,
  stop_loss     numeric(18,5),
  take_profit   numeric(18,5),
  -- open = ativo; hit_tp / hit_sl / cancelled = encerrados
  status        text not null default 'open'
                  check (status in ('open', 'hit_tp', 'hit_sl', 'cancelled')),
  -- timeframe da análise que gerou o sinal (ex.: '15min', '1h')
  timeframe     text,
  -- racional curto e nível de confiança (opcionais, úteis para UI)
  rationale     text,
  confidence    smallint check (confidence between 0 and 100),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Consulta mais comum: últimos sinais por origem.
create index if not exists signals_source_created_idx
  on public.signals (source, created_at desc);

-- Evita duplicar o mesmo sinal automático: no máximo um 'auto' aberto por símbolo.
create unique index if not exists signals_one_open_auto_per_symbol_idx
  on public.signals (symbol)
  where source = 'auto' and status = 'open';

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.signals enable row level security;

-- Todo usuário autenticado pode ler os sinais.
create policy "signals_authenticated_select" on public.signals
  for select using (auth.uid() is not null);

-- Apenas admins escrevem via webapp (service_role da edge function bypassa RLS).
create policy "signals_admin_insert" on public.signals
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "signals_admin_update" on public.signals
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "signals_admin_delete" on public.signals
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ─── updated_at automático ───────────────────────────────────────────────────
create or replace function public.signals_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger signals_updated_at
  before update on public.signals
  for each row execute function public.signals_set_updated_at();
