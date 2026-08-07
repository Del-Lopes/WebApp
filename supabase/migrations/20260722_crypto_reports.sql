-- ============================================================
-- Sessão Crypto — Relatório de Narrativa por IA (pago em Coins).
-- O usuário paga Coins; a edge function crypto-narrative busca dados do
-- CoinGecko (setores/trending), a IA redige um panorama e gravamos o
-- relatório (privado de quem pagou).
--
-- Coins = trilha_stats.total_xp. Débito transacional via RPC (nunca no client),
-- mesmo padrão de charge_signal_analysis / open_trend_panel.
-- Idempotente. Rodar via db push ou SQL Editor.
-- ============================================================

-- Custo do relatório de narrativa (editável por admin em signal_config).
insert into public.signal_config (key, value) values ('crypto_report_cost', 500)
  on conflict (key) do nothing;

-- Relatórios gerados (privados do dono).
create table if not exists public.crypto_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  content     text not null,
  -- snapshot resumido dos dados usados (setores/trending) para exibição/auditoria
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists crypto_reports_user_idx
  on public.crypto_reports (user_id, created_at desc);

alter table public.crypto_reports enable row level security;

-- Dono lê os próprios; staff vê todos (suporte/auditoria).
drop policy if exists "crypto_reports_select_own_or_staff" on public.crypto_reports;
create policy "crypto_reports_select_own_or_staff" on public.crypto_reports
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'first_mate'))
  );
-- Sem policy de INSERT direto: só a edge function (service_role) grava.

-- RPC: cobra o relatório. Retorna o novo saldo. Cobra sempre (o relatório é
-- entregue). Erros: 'not_authenticated', 'insufficient_coins'.
create or replace function public.charge_crypto_report()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_cost integer;
  v_xp   integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select value into v_cost from signal_config where key = 'crypto_report_cost';
  if v_cost is null then v_cost := 500; end if;

  select total_xp into v_xp from trilha_stats where user_id = v_uid for update;
  if v_xp is null or v_xp < v_cost then
    raise exception 'insufficient_coins';
  end if;

  update trilha_stats set total_xp = total_xp - v_cost where user_id = v_uid;
  return v_xp - v_cost;
end $$;

revoke all on function public.charge_crypto_report() from public;
grant execute on function public.charge_crypto_report() to authenticated;

-- RPC de estorno (só service_role) — se a geração falhar antes de entregar.
create or replace function public.refund_crypto_report(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cost integer;
begin
  select value into v_cost from signal_config where key = 'crypto_report_cost';
  if v_cost is null then v_cost := 500; end if;
  update trilha_stats set total_xp = total_xp + v_cost where user_id = p_user_id;
end $$;

revoke all on function public.refund_crypto_report(uuid) from public;
revoke all on function public.refund_crypto_report(uuid) from authenticated;
grant execute on function public.refund_crypto_report(uuid) to service_role;
