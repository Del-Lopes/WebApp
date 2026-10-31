-- ============================================================
-- Métricas de crescimento — correção + histórico completo.
--
-- Substitui admin_growth_metrics (20261101):
--  * Corrige erro "aggregate function calls cannot contain window function
--    calls": o acumulado era calculado com sum() over dentro do jsonb_agg,
--    o que fazia a RPC falhar sempre (gráficos vazios).
--  * p_from nulo = desde o primeiro cadastro (histórico completo).
--  * p_bucket 'auto' = escolhe dia/semana/mês pelo tamanho do intervalo.
--  * Devolve first_signup e o bucket usado.
--
-- Datas agrupadas no fuso de Brasília. Só responde a admin.
-- Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

create or replace function public.admin_growth_metrics(
  p_from   date,
  p_to     date,
  p_bucket text default 'day'
)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_tz      constant text := 'America/Sao_Paulo';
  v_first   date;
  v_from    date;
  v_to      date := coalesce(p_to, (now() at time zone 'America/Sao_Paulo')::date);
  v_bucket  text := p_bucket;
  v_step    interval;
  v_start   timestamptz;
  v_end     timestamptz;   -- exclusivo
  v_len     interval;
  v_series  jsonb;
  v_roles   jsonb;
  v_totals  jsonb;
begin
  if not public.is_admin_user() then raise exception 'forbidden'; end if;

  select (min(created_at) at time zone v_tz)::date into v_first from auth.users;
  v_from := coalesce(p_from, v_first, v_to);
  if v_from > v_to then raise exception 'invalid_range'; end if;

  if v_bucket = 'auto' then
    v_bucket := case
      when v_to - v_from > 180 then 'month'
      when v_to - v_from > 60  then 'week'
      else 'day'
    end;
  end if;
  if v_bucket not in ('day', 'week', 'month') then raise exception 'invalid_bucket'; end if;
  -- Barras diárias por anos não cabem na tela: limita só o agrupamento por dia.
  if v_bucket = 'day' and v_to - v_from > 366 * 3 then raise exception 'range_too_large'; end if;

  v_step  := ('1 ' || v_bucket)::interval;
  v_start := v_from::timestamp at time zone v_tz;
  v_end   := (v_to + 1)::timestamp at time zone v_tz;
  v_len   := v_end - v_start;

  -- Todos os períodos (zeros incluídos); acumulado = base anterior + soma
  -- corrida, calculada numa CTE (window function fora do agregado).
  with buckets as (
    select generate_series(
             date_trunc(v_bucket, v_from::timestamp),
             date_trunc(v_bucket, v_to::timestamp),
             v_step
           ) as b
  ),
  signups as (
    select date_trunc(v_bucket, created_at at time zone v_tz) as b, count(*)::int as n
      from auth.users
     where created_at >= v_start and created_at < v_end
     group by 1
  ),
  base as (
    select count(*)::int as n from auth.users where created_at < v_start
  ),
  series_rows as (
    select bk.b,
           coalesce(s.n, 0) as signups,
           (select n from base) + sum(coalesce(s.n, 0)) over (order by bk.b) as cumulative
      from buckets bk
      left join signups s on s.b = bk.b
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'bucket',     to_char(b, 'YYYY-MM-DD'),
           'signups',    signups,
           'cumulative', cumulative
         ) order by b), '[]'::jsonb)
    into v_series
    from series_rows;

  select coalesce(jsonb_agg(jsonb_build_object('role', role, 'count', n) order by n desc), '[]'::jsonb)
    into v_roles
    from (
      select coalesce(p.role, 'sem_perfil') as role, count(*)::int as n
        from auth.users u
        left join profiles p on p.id = u.id
       group by 1
    ) r;

  select jsonb_build_object(
    'total_users',     (select count(*) from auth.users),
    'new_in_range',    (select count(*) from auth.users where created_at >= v_start and created_at < v_end),
    'new_prev_range',  (select count(*) from auth.users where created_at >= v_start - v_len and created_at < v_start),
    'active_7d',       (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'active_30d',      (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
    'never_signed_in', (select count(*) from auth.users where last_sign_in_at is null),
    'new_today',       (select count(*) from auth.users
                         where created_at >= date_trunc('day', now() at time zone v_tz) at time zone v_tz)
  ) into v_totals;

  return jsonb_build_object(
    'series',       v_series,
    'roles',        v_roles,
    'totals',       v_totals,
    'bucket',       v_bucket,
    'from',         to_char(v_from, 'YYYY-MM-DD'),
    'to',           to_char(v_to, 'YYYY-MM-DD'),
    'first_signup', to_char(v_first, 'YYYY-MM-DD')
  );
end $$;

revoke all on function public.admin_growth_metrics(date, date, text) from public, anon;
grant execute on function public.admin_growth_metrics(date, date, text) to authenticated;

commit;
