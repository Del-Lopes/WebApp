-- Mesas Proprietárias › Gestão: objetivo e valores padrão de cada usuário.
-- Uma linha por usuário (user_id é a chave). Privado: só o dono lê e altera.
--
-- Rodar no SQL Editor do Supabase (depois de 20261110_prop_tracker.sql).

begin;

create table if not exists public.prop_tracker_settings (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  next_size     numeric(14,2) not null default 10000 check (next_size > 0),   -- tamanho da próxima conta
  next_cost     numeric(14,2) not null default 10    check (next_cost >= 0),  -- valor pago por ela
  split_pct     numeric(5,2)  not null default 100   check (split_pct between 0 and 100),
  reinvest_pct  numeric(5,2)  not null default 100   check (reinvest_pct between 0 and 100),
  max_accounts  integer       not null default 50    check (max_accounts between 1 and 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists prop_tracker_settings_set_updated_at on public.prop_tracker_settings;
create trigger prop_tracker_settings_set_updated_at
  before update on public.prop_tracker_settings
  for each row execute function public.set_updated_at();

alter table public.prop_tracker_settings enable row level security;

drop policy if exists "prop_tracker_settings_select_own" on public.prop_tracker_settings;
create policy "prop_tracker_settings_select_own" on public.prop_tracker_settings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "prop_tracker_settings_insert_own" on public.prop_tracker_settings;
create policy "prop_tracker_settings_insert_own" on public.prop_tracker_settings
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "prop_tracker_settings_update_own" on public.prop_tracker_settings;
create policy "prop_tracker_settings_update_own" on public.prop_tracker_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "prop_tracker_settings_delete_own" on public.prop_tracker_settings;
create policy "prop_tracker_settings_delete_own" on public.prop_tracker_settings
  for delete to authenticated using (auth.uid() = user_id);

commit;
