-- ============================================================
-- Trilha Gain: progresso dos nós Gain e Revisão Geral.
--
-- Bug: o mapa cria esses nós com ids sintéticos ('licao-<unidade>-<n>' e
-- 'revisao-<unidade>'), que não são UUIDs. trilha_progress.lesson_id é uuid com
-- FK para trilha_lessons, então a conclusão deles nunca foi gravada: a unidade
-- nunca fecha e a seguinte nunca abre (admin não percebe, pois ignora o bloqueio).
--
-- Esta migration cria a tabela e a RPC complete_trilha_node, e recupera quem já
-- concluiu as aulas. NÃO mexe em Coins: o crédito continua só em complete_lesson.
-- Idempotente. Rodar no SQL Editor ANTES do deploy do front.
-- ============================================================

begin;

create table if not exists public.trilha_node_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  node_id      text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

alter table public.trilha_node_progress enable row level security;

-- Só leitura pelo dono ou staff; a escrita é só pela RPC (security definer).
drop policy if exists "trilha_node_progress_select_own_or_staff" on public.trilha_node_progress;
create policy "trilha_node_progress_select_own_or_staff" on public.trilha_node_progress
  for select to authenticated using (auth.uid() = user_id or public.is_staff());

create or replace function public.complete_trilha_node(p_node_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_unit   uuid;
  v_locked boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  if p_node_id ~ '^licao-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9]+$' then
    v_unit := substring(p_node_id from 7 for 36)::uuid;
  elsif p_node_id ~ '^revisao-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_unit := substring(p_node_id from 9 for 36)::uuid;
  else
    raise exception 'invalid_node';
  end if;

  select coalesce(is_locked, false) into v_locked from trilha_units where id = v_unit;
  if not found then raise exception 'unit_not_found'; end if;

  -- Mesma regra de complete_lesson: unidade Premium só para quem a desbloqueou.
  if v_locked and not public.is_staff()
     and not exists (select 1 from trilha_unit_unlocks where user_id = v_uid and unit_id = v_unit) then
    raise exception 'unit_locked';
  end if;

  insert into trilha_node_progress (user_id, node_id) values (v_uid, p_node_id)
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.complete_trilha_node(text) from public, anon;
grant execute on function public.complete_trilha_node(text) to authenticated;

-- ─── Recuperação de quem já passou pelos Gains ─────────────────────────────
-- O player só avança se o exercício for acertado, então quem concluiu as duas
-- aulas cobertas por um Gain já fez os exercícios dele. Mesma regra do app
-- (components/TrilhaGain/unitNodes.ts): Gain fecha a cada 2 aulas (índice 1, 3,
-- 5…, 0-based) enquanto i < n - (n par ? 2 : 1); a Revisão cobre a unidade toda.

with ordered as (
  select l.id, l.unit_id,
         (row_number() over (partition by l.unit_id order by l.order_index, l.id) - 1)::int as i,
         (count(*) over (partition by l.unit_id))::int as n
    from trilha_lessons l
),
done as (
  select p.user_id, o.unit_id, o.i, o.n
    from trilha_progress p join ordered o on o.id = p.lesson_id
)
insert into trilha_node_progress (user_id, node_id)
select d.user_id, 'licao-' || d.unit_id || '-' || d.i
  from done d
  join done prev on prev.user_id = d.user_id and prev.unit_id = d.unit_id and prev.i = d.i - 1
 where d.i % 2 = 1
   and d.i < d.n - case when d.n % 2 = 0 then 2 else 1 end
on conflict do nothing;

insert into trilha_node_progress (user_id, node_id)
select d.user_id, 'revisao-' || d.unit_id
  from (
    select p.user_id, o.unit_id, o.n, count(*) as feitas
      from trilha_progress p
      join (
        select l.id, l.unit_id, (count(*) over (partition by l.unit_id))::int as n from trilha_lessons l
      ) o on o.id = p.lesson_id
     group by p.user_id, o.unit_id, o.n
  ) d
 where d.feitas = d.n
on conflict do nothing;

commit;

-- Conferência (troque o e-mail): devem aparecer os Gains e a Revisão da Unidade 1.
--   select node_id from trilha_node_progress
--    where user_id = (select id from auth.users where email = 'EMAIL') order by 1;
