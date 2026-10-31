-- ============================================================
-- Métricas de crescimento (Painel Admin › Crescimento).
--
-- admin_growth_metrics(from, to, bucket): cadastros por período (dia/semana/
-- mês, com períodos vazios preenchidos com zero), total acumulado, comparação
-- com o período anterior de mesmo tamanho, usuários ativos (último login) e
-- distribuição por papel. Lê auth.users (fonte de verdade do cadastro), por
-- isso é SECURITY DEFINER — e só responde a admin.
--
-- Datas agrupadas no fuso de Brasília. Depende de is_admin_user()
-- (20260926_security_hardening). Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

create or replace function public.admin_growth_metrics(
  p_from   date,
  p_to     date,
  p_bucket text default 'day'
)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_tz        constant text := 'America/Sao_Paulo';
  v_step      interval;
  v_start     timestamptz;
  v_end       timestamptz;   -- exclusivo
  v_len       interval;
  v_series    jsonb;
  v_roles     jsonb;
  v_totals    jsonb;
begin
  if not public.is_admin_user() then raise exception 'forbidden'; end if;
  if p_bucket not in ('day', 'week', 'month') then raise exception 'invalid_bucket'; end if;
  if p_from is null or p_to is null or p_from > p_to then raise exception 'invalid_range'; end if;
  if p_to - p_from > 366 * 3 then raise exception 'range_too_large'; end if;

  v_step  := ('1 ' || p_bucket)::interval;
  v_start := p_from::timestamp at time zone v_tz;
  v_end   := (p_to + 1)::timestamp at time zone v_tz;
  v_len   := v_end - v_start;

  -- Série com todos os períodos (zeros incluídos) + acumulado desde o início.
  with buckets as (
    select generate_series(
             date_trunc(p_bucket, p_from::timestamp),
             date_trunc(p_bucket, p_to::timestamp),
             v_step
           ) as b
  ),
  signups as (
    select date_trunc(p_bucket, created_at at time zone v_tz) as b, count(*)::int as n
      from auth.users
     where created_at >= v_start and created_at < v_end
     group by 1
  ),
  base as (
    select count(*)::int as n from auth.users where created_at < v_start
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'bucket',     to_char(bk.b, 'YYYY-MM-DD'),
           'signups',    coalesce(s.n, 0),
           'cumulative', (select n from base) + sum(coalesce(s.n, 0)) over (order by bk.b)
         ) order by bk.b), '[]'::jsonb)
    into v_series
    from buckets bk
    left join signups s on s.b = bk.b;

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

  return jsonb_build_object('series', v_series, 'roles', v_roles, 'totals', v_totals);
end $$;

revoke all on function public.admin_growth_metrics(date, date, text) from public, anon;
grant execute on function public.admin_growth_metrics(date, date, text) to authenticated;

commit;
