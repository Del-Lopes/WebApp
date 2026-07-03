-- ============================================================
-- Sinais on-demand pagos em Coins.
--
-- Modelo: o usuário clica "Analisar mercado", isso DEBITA Coins
-- (trilha_stats.total_xp, mesma moeda da Trilha Gain) e dispara a edge
-- function signals-generate, que entrega SEMPRE um parecer (leitura de
-- tendência + indicadores + macro por IA) e, quando o setup dispara,
-- também a entrada (direção/entrada/stop/alvo).
--
-- Privacidade: sinais 'auto' são privados de quem pagou (user_id preenchido).
-- Sinais 'setup' (do time) continuam públicos (user_id NULL).
--
-- O débito acontece SÓ na RPC charge_signal_analysis (SECURITY DEFINER,
-- transacional) — nunca no client, mesmo princípio de redeem_unit_unlock.
--
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor ou via db push.
-- ============================================================

-- 1. Evolui a tabela signals para o modelo on-demand ------------------------

-- Dono do sinal auto (privado). NULL = sinal público (setup do time).
alter table public.signals
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Parecer textual entregue em toda análise (com ou sem entrada).
alter table public.signals
  add column if not exists analysis text;

-- Nem toda análise vira sinal com entrada: quando não há setup, action fica
-- 'NONE' e entry/stop/alvo ficam nulos, mas o parecer é entregue.
alter table public.signals
  drop constraint if exists signals_action_check;
alter table public.signals
  add constraint signals_action_check check (action in ('BUY', 'SELL', 'NONE'));

-- entry_price passa a ser opcional (análise sem entrada).
alter table public.signals
  alter column entry_price drop not null;

-- Índices de leitura por dono.
create index if not exists signals_user_created_idx
  on public.signals (user_id, created_at desc);

-- O índice único antigo (1 auto aberto por símbolo) não faz sentido no modelo
-- on-demand privado — cada usuário pode ter o seu. Passa a ser por (user, símbolo).
drop index if exists public.signals_one_open_auto_per_symbol_idx;

-- 2. RLS: cada um vê os próprios 'auto' + todos os 'setup' -------------------

drop policy if exists "signals_authenticated_select" on public.signals;
create policy "signals_select_own_auto_or_public_setup" on public.signals
  for select using (
    -- sinais públicos do time
    (source = 'setup')
    -- ou os próprios sinais auto
    or (auth.uid() = user_id)
    -- staff enxerga tudo (suporte/auditoria)
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'first_mate')
    )
  );

-- 3. Preço da análise em Coins (editável por admin) -------------------------

create table if not exists public.signal_config (
  key   text primary key,
  value integer not null
);
insert into public.signal_config (key, value) values ('analysis_cost', 500)
  on conflict (key) do nothing;

alter table public.signal_config enable row level security;
drop policy if exists "signal_config_public_read" on public.signal_config;
create policy "signal_config_public_read" on public.signal_config for select using (true);
drop policy if exists "signal_config_admin_write" on public.signal_config;
create policy "signal_config_admin_write" on public.signal_config for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 4. RPC transacional de cobrança -------------------------------------------
-- Debita analysis_cost Coins do usuário logado. Retorna o novo saldo.
-- Erros: 'not_authenticated', 'insufficient_coins'.
-- Cobra SEMPRE (a análise é entregue com ou sem entrada) — por isso o débito
-- é separado da geração: a edge function chama isto ANTES de analisar.
create or replace function public.charge_signal_analysis()
returns integer            -- novo saldo (total_xp)
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_cost integer;
  v_xp   integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select value into v_cost from signal_config where key = 'analysis_cost';
  if v_cost is null then v_cost := 500; end if;

  select total_xp into v_xp from trilha_stats where user_id = v_uid for update;
  if v_xp is null or v_xp < v_cost then
    raise exception 'insufficient_coins';
  end if;

  update trilha_stats set total_xp = total_xp - v_cost where user_id = v_uid;
  return v_xp - v_cost;
end $$;

revoke all on function public.charge_signal_analysis() from public;
grant execute on function public.charge_signal_analysis() to authenticated;

-- 5. RPC de estorno (só service_role) ---------------------------------------
-- Recredita o custo da análise quando a geração falha ANTES de entregar
-- (ex.: a fonte de cotações caiu). Chamada só pela edge function com
-- service_role — não é exposta a usuários autenticados.
create or replace function public.refund_signal_analysis(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cost integer;
begin
  select value into v_cost from signal_config where key = 'analysis_cost';
  if v_cost is null then v_cost := 500; end if;
  update trilha_stats set total_xp = total_xp + v_cost where user_id = p_user_id;
end $$;

revoke all on function public.refund_signal_analysis(uuid) from public;
revoke all on function public.refund_signal_analysis(uuid) from authenticated;
grant execute on function public.refund_signal_analysis(uuid) to service_role;
