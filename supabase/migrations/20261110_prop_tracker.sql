-- Mesas Proprietárias › Gestão (acompanhamento manual da alavancagem).
-- Contas reais, resultado diário por conta e saques lançados pelo próprio usuário.
-- Tudo privado: cada usuário só enxerga e altera as próprias linhas.
--
-- Rodar no SQL Editor do Supabase.

begin;

create table if not exists public.prop_tracker_accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text,
  size       numeric(14,2) not null check (size > 0),     -- tamanho da conta (US$)
  cost       numeric(14,2) not null default 0 check (cost >= 0),  -- valor pago
  split_pct  numeric(5,2)  not null default 100 check (split_pct between 0 and 100),
  opened_on  date not null default current_date,
  closed_on  date,                                        -- encerrada/queimada
  created_at timestamptz not null default now(),
  check (closed_on is null or closed_on >= opened_on)
);
create index if not exists prop_tracker_accounts_user_idx
  on public.prop_tracker_accounts (user_id, opened_on);

create table if not exists public.prop_tracker_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.prop_tracker_accounts(id) on delete cascade,
  day        date not null,
  amount     numeric(14,2) not null,                      -- resultado BRUTO da conta no dia
  created_at timestamptz not null default now(),
  unique (account_id, day)
);
create index if not exists prop_tracker_results_user_day_idx
  on public.prop_tracker_results (user_id, day);

create table if not exists public.prop_tracker_withdrawals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  amount     numeric(14,2) not null check (amount > 0),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists prop_tracker_withdrawals_user_idx
  on public.prop_tracker_withdrawals (user_id, day);

-- RLS: somente as próprias linhas.
do $$
declare t text;
begin
  foreach t in array array['prop_tracker_accounts', 'prop_tracker_results', 'prop_tracker_withdrawals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('create policy "%s_select_own" on public.%I for select to authenticated using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- Um resultado só pode apontar para conta do próprio usuário.
create or replace function public.prop_tracker_results_guard()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.prop_tracker_accounts a where a.id = new.account_id and a.user_id = new.user_id) then
    raise exception 'invalid_account';
  end if;
  return new;
end $$;

drop trigger if exists prop_tracker_results_guard_trg on public.prop_tracker_results;
create trigger prop_tracker_results_guard_trg
  before insert or update on public.prop_tracker_results
  for each row execute function public.prop_tracker_results_guard();

commit;
