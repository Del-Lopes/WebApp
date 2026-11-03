-- Loja de Coins: pacotes progressivos + pedidos pagos por NOWPayments (cripto),
-- Asaas (cartão) e Depix (Pix). O crédito SÓ acontece no servidor, pela RPC
-- credit_coin_order, chamada exclusivamente pelos webhooks (service_role).
-- Coins = trilha_stats.total_xp.
--
-- Rodar no SQL Editor do Supabase.

begin;

-- ── Pacotes ─────────────────────────────────────────────────────────────
create table if not exists public.coin_packages (
  id         text primary key,                  -- slug: starter, plus, pro, elite
  name       text not null,
  price_brl  numeric(10,2) not null check (price_brl > 0),
  coins      integer not null check (coins > 0),
  bonus_pct  integer not null default 0 check (bonus_pct >= 0),   -- só exibição
  highlight  boolean not null default false,
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.coin_packages enable row level security;

drop policy if exists "coin_packages_select_active" on public.coin_packages;
create policy "coin_packages_select_active" on public.coin_packages
  for select to authenticated
  using (active or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "coin_packages_admin_write" on public.coin_packages;
create policy "coin_packages_admin_write" on public.coin_packages
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

insert into public.coin_packages (id, name, price_brl, coins, bonus_pct, highlight, sort_order) values
  ('starter', 'Starter',  25.00,  250,  0, false, 1),
  ('plus',    'Plus',     50.00,  550, 10, false, 2),
  ('pro',     'Pro',     100.00, 1200, 20, true,  3),
  ('elite',   'Elite',   250.00, 3250, 30, false, 4)
on conflict (id) do nothing;

-- ── Pedidos ─────────────────────────────────────────────────────────────
create table if not exists public.coin_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  package_id    text references public.coin_packages(id) on delete set null,
  -- Congelados na criação: mudar o pacote depois não altera pedidos antigos.
  coins         integer not null check (coins > 0),
  price_brl     numeric(10,2) not null check (price_brl > 0),
  method        text not null check (method in ('nowpayments', 'asaas', 'depix')),
  status        text not null default 'pending'
                  check (status in ('pending', 'paid', 'expired', 'failed')),
  external_id   text,                -- invoice (NOWPayments), paymentLink (Asaas), id Depix
  checkout_url  text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  credited_at   timestamptz,         -- preenchido uma única vez pela RPC
  balance_after integer
);

create unique index if not exists coin_orders_method_external_uidx
  on public.coin_orders (method, external_id) where external_id is not null;
create index if not exists coin_orders_user_idx
  on public.coin_orders (user_id, created_at desc);

alter table public.coin_orders enable row level security;

-- O usuário só LÊ os próprios pedidos. Nenhuma escrita pelo client: pedidos
-- nascem na edge function coin-checkout e mudam de estado nos webhooks.
drop policy if exists "coin_orders_select_own" on public.coin_orders;
create policy "coin_orders_select_own" on public.coin_orders
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "coin_orders_staff_select" on public.coin_orders;
create policy "coin_orders_staff_select" on public.coin_orders
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'first_mate')));

-- ── Crédito idempotente ─────────────────────────────────────────────────
-- Chamada só pelo service_role (webhooks). Trava a linha do pedido: duas
-- notificações simultâneas do mesmo pagamento creditam uma única vez.
-- Retorna o novo saldo. Erros: 'order_not_found'.
create or replace function public.credit_coin_order(p_order_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_order public.coin_orders%rowtype;
  v_new   integer;
begin
  select * into v_order from public.coin_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if v_order.credited_at is not null then
    return v_order.balance_after;               -- já creditado: no-op
  end if;

  insert into public.trilha_stats (user_id, total_xp, current_streak, best_streak)
  values (v_order.user_id, v_order.coins, 0, 0)
  on conflict (user_id) do update
    set total_xp = trilha_stats.total_xp + v_order.coins
  returning total_xp into v_new;

  update public.coin_orders
     set status = 'paid', paid_at = coalesce(paid_at, now()),
         credited_at = now(), balance_after = v_new
   where id = p_order_id;

  return v_new;
end $$;

revoke all on function public.credit_coin_order(uuid) from public, anon, authenticated;
grant execute on function public.credit_coin_order(uuid) to service_role;

-- Marca pedido pendente como expirado/falho (nunca mexe em pedido já pago).
create or replace function public.close_coin_order(p_order_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('expired', 'failed') then raise exception 'invalid_status'; end if;
  update public.coin_orders set status = p_status
   where id = p_order_id and status = 'pending' and credited_at is null;
end $$;

revoke all on function public.close_coin_order(uuid, text) from public, anon, authenticated;
grant execute on function public.close_coin_order(uuid, text) to service_role;

commit;
