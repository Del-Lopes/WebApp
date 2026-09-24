-- ============================================================
-- Segurança pré-lançamento (auditoria 2026-09-26).
--
-- Corrige falhas CONFIRMADAS em produção:
--   1. Qualquer pessoa (sem login) criava Coins para qualquer usuário:
--      refund_signal_analysis / refund_crypto_report executáveis por anon.
--   2. O usuário editava o próprio saldo: policies de INSERT/UPDATE do dono
--      em trilha_stats (e o XP era calculado no navegador).
--   3. profiles legível por anon (nome, e-mail, papel, conta MT5).
--   4. O usuário mudava o próprio role (virava admin) — policy de UPDATE
--      sem restrição de coluna.
--   5. As 4 tabelas de licença legíveis por anon com user_id e notas, e o
--      usuário inseria licença já 'approved' sem validade.
--   6. partner_requests: o dono aprovava o próprio pedido.
--   7. handbot_params: configuração de risco de todos os clientes para anon.
--   8. trilha_steps: conteúdo Premium legível sem desbloquear.
--   9. chat_messages: o usuário inseria mensagens como 'assistant'.
--  10. strategy_mt5_link: o usuário tomava uma estratégia da vitrine.
--
-- Compatibilidade preservada de propósito:
--   - Validadores PHP dos EAs (php_api/validate_*.php) leem as tabelas de
--     licença como anon filtrando mt5_account + status. Continuam funcionando,
--     mas agora o anon só enxerga id, mt5_account, status e expires_at.
--   - O EA do Hand Bot lê handbot_params.needs_sync como anon. Continua, mas
--     o anon só enxerga handbot_link_id e needs_sync.
--   - Edge functions usam service_role e não são afetadas pela RLS.
--
-- Rodar INTEIRO no SQL Editor (transação única: ou aplica tudo, ou nada).
-- Idempotente. Depois de aplicar, publicar o front que usa a RPC
-- complete_lesson (até lá, concluir lição não credita Coins).
-- ============================================================

begin;

-- ─── 0. Funções auxiliares ──────────────────────────────────────────────────

-- Papel do usuário logado, lido com os privilégios do dono da função (não
-- passa pela RLS de profiles, que depende dele — evita recursão).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'first_mate'));
$$;

create or replace function public.is_admin_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- anon continua podendo executar: policies de tabelas públicas podem chamar
-- estas funções e o anon receberia erro em vez de linhas. Elas só dizem se o
-- PRÓPRIO chamador é staff — para anon, sempre false.
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin_user() from public;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_admin_user() to anon, authenticated, service_role;

-- is_admin(uuid) antiga (usada por protect_license_fields): fixa search_path.
do $$ begin
  if to_regprocedure('public.is_admin(uuid)') is not null then
    alter function public.is_admin(uuid) set search_path = public;
  end if;
  if to_regprocedure('public.protect_license_fields()') is not null then
    alter function public.protect_license_fields() set search_path = public;
  end if;
  if to_regprocedure('public.handle_new_user()') is not null then
    alter function public.handle_new_user() set search_path = public;
  end if;
end $$;

-- Remove TODAS as policies de uma tabela (as de produção nem sempre batem com
-- o repositório — ex.: "Public license verification policy" criada à mão).
create or replace function pg_temp.drop_all_policies(p_table text)
returns void language plpgsql as $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = p_table loop
    execute format('drop policy if exists %I on public.%I', r.policyname, p_table);
  end loop;
end $$;

-- ─── 1. Estornos de Coins só pelo servidor ─────────────────────────────────

do $$ begin
  if to_regprocedure('public.refund_signal_analysis(uuid)') is not null then
    revoke all on function public.refund_signal_analysis(uuid) from public, anon, authenticated;
    grant execute on function public.refund_signal_analysis(uuid) to service_role;
  end if;
  if to_regprocedure('public.refund_crypto_report(uuid)') is not null then
    revoke all on function public.refund_crypto_report(uuid) from public, anon, authenticated;
    grant execute on function public.refund_crypto_report(uuid) to service_role;
  end if;
end $$;

-- Funções criadas daqui em diante não ganham EXECUTE para anon por padrão.
alter default privileges in schema public revoke execute on functions from anon;

-- ─── 2. Coins: crédito de lição só pelo servidor ───────────────────────────

drop policy if exists "trilha_stats_insert_own" on public.trilha_stats;
drop policy if exists "trilha_stats_update_own" on public.trilha_stats;
drop policy if exists "trilha_progress_insert_own" on public.trilha_progress;
drop policy if exists "trilha_progress_update_own" on public.trilha_progress;

-- Conclui uma lição: o XP vem da tabela (não do cliente), credita uma única
-- vez (a UNIQUE de trilha_progress decide quem foi o primeiro, inclusive em
-- cliques simultâneos) e atualiza o streak pelo dia de Brasília.
-- Unidade Premium só credita para quem desbloqueou (ou staff).
create or replace function public.complete_lesson(p_lesson_id uuid, p_score integer default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_xp      integer;
  v_unit    uuid;
  v_locked  boolean;
  v_today   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_first   boolean;
  v_stats   trilha_stats%rowtype;
  v_streak  integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select l.xp_reward, l.unit_id, coalesce(u.is_locked, false)
    into v_xp, v_unit, v_locked
    from trilha_lessons l join trilha_units u on u.id = l.unit_id
   where l.id = p_lesson_id;
  if v_unit is null then raise exception 'lesson_not_found'; end if;

  if v_locked and not public.is_staff()
     and not exists (select 1 from trilha_unit_unlocks where user_id = v_uid and unit_id = v_unit) then
    raise exception 'unit_locked';
  end if;

  insert into trilha_progress (user_id, lesson_id, score)
  values (v_uid, p_lesson_id, greatest(0, least(coalesce(p_score, 100), 100)))
  on conflict (user_id, lesson_id) do update
    set score = greatest(trilha_progress.score, excluded.score)
  returning (xmax = 0) into v_first;   -- true = linha nova (primeira conclusão)

  if not v_first then
    return jsonb_build_object('first_time', false,
      'total_xp', (select total_xp from trilha_stats where user_id = v_uid));
  end if;

  insert into trilha_stats (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_stats from trilha_stats where user_id = v_uid for update;

  v_streak := case
    when v_stats.last_activity_date = v_today then greatest(v_stats.current_streak, 1)
    when v_stats.last_activity_date = v_today - 1 then v_stats.current_streak + 1
    else 1 end;

  update trilha_stats
     set total_xp = total_xp + coalesce(v_xp, 0),
         current_streak = v_streak,
         best_streak = greatest(best_streak, v_streak),
         last_activity_date = v_today,
         updated_at = now()
   where user_id = v_uid
  returning * into v_stats;

  return jsonb_build_object('first_time', true, 'total_xp', v_stats.total_xp,
    'current_streak', v_stats.current_streak, 'best_streak', v_stats.best_streak);
end $$;

revoke all on function public.complete_lesson(uuid, integer) from public, anon;
grant execute on function public.complete_lesson(uuid, integer) to authenticated;

-- ─── 3. Conteúdo Premium da Trilha ─────────────────────────────────────────

create or replace function public.can_read_trilha_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select not u.is_locked
        or public.is_staff()
        or exists (select 1 from trilha_unit_unlocks x where x.user_id = auth.uid() and x.unit_id = u.id)
      from trilha_lessons l join trilha_units u on u.id = l.unit_id
     where l.id = p_lesson_id
  ), false);
$$;
grant execute on function public.can_read_trilha_lesson(uuid) to anon, authenticated;

drop policy if exists "trilha_steps_public_read" on public.trilha_steps;
create policy "trilha_steps_read_if_accessible" on public.trilha_steps
  for select using (public.can_read_trilha_lesson(lesson_id));

-- ─── 4. profiles ────────────────────────────────────────────────────────────

select pg_temp.drop_all_policies('profiles');
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_staff" on public.profiles
  for select to authenticated using (auth.uid() = id or public.is_staff());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated using (auth.uid() = id or public.is_admin_user())
  with check (auth.uid() = id or public.is_admin_user());
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.is_admin_user());

-- Colunas sensíveis: só admin (ou o servidor, sem auth.uid()) muda o role;
-- o e-mail só pode ser o do próprio login.
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin_user() then
    return new;   -- service_role, SQL Editor, triggers de auth ou admin
  end if;
  if tg_op = 'INSERT' then
    new.role := 'client';
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'forbidden_role_change';
  end if;
  if new.id <> old.id then
    raise exception 'forbidden_id_change';
  end if;
  if new.email is distinct from old.email
     and new.email is distinct from (auth.jwt() ->> 'email') then
    raise exception 'forbidden_email_change';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- ─── 5. Licenças (4 tabelas) ────────────────────────────────────────────────

create or replace function public.protect_license_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin_user() then
    new.status := 'pending';
    new.expires_at := null;
    new.user_id := auth.uid();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['license_requests','license_requests_snowball','license_requests_boletapro','license_requests_fxsquad'] loop
    if to_regclass('public.' || t) is null then continue; end if;

    perform pg_temp.drop_all_policies(t);
    execute format('alter table public.%I enable row level security', t);

    execute format('create policy "lic_select_own_or_staff" on public.%I for select to authenticated using (auth.uid() = user_id or public.is_staff())', t);
    execute format('create policy "lic_insert_own" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "lic_update_own_or_admin" on public.%I for update to authenticated using (auth.uid() = user_id or public.is_admin_user()) with check (auth.uid() = user_id or public.is_admin_user())', t);
    execute format('create policy "lic_delete_admin" on public.%I for delete to authenticated using (public.is_admin_user())', t);

    -- Validadores PHP: anon lê só licenças aprovadas e só 4 colunas.
    execute format('create policy "lic_anon_verify_approved" on public.%I for select to anon using (status = ''approved'')', t);
    execute format('revoke select on public.%I from anon', t);
    execute format('grant select (id, mt5_account, status, expires_at) on public.%I to anon', t);

    execute format('drop trigger if exists tr_protect_license_insert on public.%I', t);
    execute format('create trigger tr_protect_license_insert before insert on public.%I for each row execute function public.protect_license_insert()', t);

    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
    execute format('create index if not exists %I on public.%I (mt5_account, status)', t || '_verify_idx', t);
  end loop;
end $$;

-- ─── 6. partner_requests ───────────────────────────────────────────────────

do $$ begin
  if to_regclass('public.partner_requests') is not null then
    perform pg_temp.drop_all_policies('partner_requests');
    alter table public.partner_requests enable row level security;
    create policy "partner_req_select_own_or_staff" on public.partner_requests
      for select to authenticated using (auth.uid() = user_id or public.is_staff());
    create policy "partner_req_insert_own_pending" on public.partner_requests
      for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
    create policy "partner_req_update_admin" on public.partner_requests
      for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
    create policy "partner_req_delete_admin" on public.partner_requests
      for delete to authenticated using (public.is_admin_user());
    create index if not exists partner_requests_user_idx on public.partner_requests (user_id, status);
  end if;
end $$;

-- ─── 7. prospects: cada parceiro só os seus; staff vê todos ────────────────

do $$ begin
  if to_regclass('public.prospects') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'prospects' and column_name = 'partner_id') then
    perform pg_temp.drop_all_policies('prospects');
    alter table public.prospects enable row level security;
    create policy "prospects_select_own_or_staff" on public.prospects
      for select to authenticated using (partner_id = auth.uid() or public.is_staff());
    create policy "prospects_insert_own" on public.prospects
      for insert to authenticated with check (partner_id = auth.uid() or public.is_staff());
    create policy "prospects_update_own_or_staff" on public.prospects
      for update to authenticated using (partner_id = auth.uid() or public.is_staff())
      with check (partner_id = auth.uid() or public.is_staff());
    create policy "prospects_delete_own_or_staff" on public.prospects
      for delete to authenticated using (partner_id = auth.uid() or public.is_staff());
    create index if not exists prospects_partner_idx on public.prospects (partner_id, created_at desc);
  end if;
end $$;

-- ─── 8. ai_configurations: só admin (guarda chaves de IA) ─────────────────

do $$ begin
  if to_regclass('public.ai_configurations') is not null then
    perform pg_temp.drop_all_policies('ai_configurations');
    alter table public.ai_configurations enable row level security;
    create policy "ai_config_admin_all" on public.ai_configurations
      for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

-- ─── 9. handbot_params: anon (EA) só vê needs_sync ─────────────────────────

do $$ begin
  if to_regclass('public.handbot_params') is not null then
    revoke select on public.handbot_params from anon;
    grant select (handbot_link_id, needs_sync) on public.handbot_params to anon;
  end if;
end $$;

-- ─── 10. chat_messages: mensagens só entram pelo servidor ──────────────────

drop policy if exists "chat_messages_insert_own" on public.chat_messages;

-- ─── 11. strategy_mt5_link: vínculo só pela edge function (valida admin) ──

do $$
declare r record;
begin
  if to_regclass('public.strategy_mt5_link') is not null then
    for r in select policyname from pg_policies
             where schemaname = 'public' and tablename = 'strategy_mt5_link' and cmd <> 'SELECT' loop
      execute format('drop policy if exists %I on public.strategy_mt5_link', r.policyname);
    end loop;
  end if;
end $$;

-- ─── 12. Limite diário do chat, atômico ────────────────────────────────────
-- A function lia o contador, chamava a IA e só depois gravava +1: N mensagens
-- em paralelo passavam do limite. Agora a vaga é reservada antes da IA num
-- único comando (só incrementa se ainda está abaixo do limite) e devolvida se
-- a chamada falhar. Uso exclusivo do servidor.

create or replace function public.chat_reserve_message(p_user_id uuid, p_limit integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  insert into chat_usage (user_id, usage_date, message_count)
  values (p_user_id, (now() at time zone 'UTC')::date, 1)
  on conflict (user_id, usage_date) do update
    set message_count = chat_usage.message_count + 1
    where chat_usage.message_count < p_limit
  returning message_count into v_count;
  return coalesce(v_count, -1);   -- -1 = limite atingido
end $$;

create or replace function public.chat_release_message(p_user_id uuid)
returns void language sql security definer set search_path = public as $$
  update chat_usage set message_count = greatest(message_count - 1, 0)
   where user_id = p_user_id and usage_date = (now() at time zone 'UTC')::date;
$$;

revoke all on function public.chat_reserve_message(uuid, integer) from public, anon, authenticated;
revoke all on function public.chat_release_message(uuid) from public, anon, authenticated;
grant execute on function public.chat_reserve_message(uuid, integer) to service_role;
grant execute on function public.chat_release_message(uuid) to service_role;

-- ─── 13. Índices das consultas mais usadas ─────────────────────────────────

do $$ begin
  if to_regclass('public.articles') is not null then
    create index if not exists articles_created_idx on public.articles (created_at desc);
  end if;
  if to_regclass('public.profiles') is not null then
    create index if not exists profiles_role_idx on public.profiles (role);
  end if;
  if to_regclass('public.chat_messages') is not null then
    create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);
  end if;
  if to_regclass('public.chat_feedback') is not null then
    create index if not exists chat_feedback_created_idx on public.chat_feedback (created_at desc);
  end if;
  if to_regclass('public.mt5_trades') is not null then
    create index if not exists mt5_trades_report_close_idx on public.mt5_trades (report_id, close_time);
  end if;
end $$;

commit;

-- ─── Conferência (rodar depois, sem login: devem voltar vazio ou erro) ─────
--   select has_function_privilege('anon', 'public.refund_signal_analysis(uuid)', 'execute');  -- false
--   select policyname, cmd, roles from pg_policies where tablename in ('profiles','license_requests') order by 1;
