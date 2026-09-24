-- ============================================================
-- Sala ao Vivo — link editável pelo admin e acesso liberado por usuário.
--
-- 1) live_room_config (1 linha): link da sala e horário exibido. Só admin lê
--    e grava direto; os demais recebem o link pela RPC get_live_room(), que
--    só o devolve a quem tem acesso. Assim o link nunca chega ao navegador de
--    quem não pagou, nem pela API.
-- 2) live_room_access: quem pode entrar (liberado pelo admin, um a um).
--    Staff (admin/first_mate) sempre tem acesso.
--
-- Depende de is_staff() / is_admin_user() (20260926_security_hardening).
-- Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

create table if not exists public.live_room_config (
  id          smallint primary key default 1 check (id = 1),
  url         text,
  schedule    text,                         -- ex.: "Seg a Sex · 9h às 11h (Brasília)"
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

insert into public.live_room_config (id) values (1) on conflict (id) do nothing;

alter table public.live_room_config enable row level security;

drop policy if exists "live_room_config_admin_all" on public.live_room_config;
create policy "live_room_config_admin_all" on public.live_room_config
  for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());

create table if not exists public.live_room_access (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  granted_by  uuid references auth.users(id) on delete set null,
  granted_at  timestamptz not null default now()
);

alter table public.live_room_access enable row level security;

drop policy if exists "live_room_access_select_own_or_staff" on public.live_room_access;
create policy "live_room_access_select_own_or_staff" on public.live_room_access
  for select to authenticated using (auth.uid() = user_id or public.is_staff());

drop policy if exists "live_room_access_admin_insert" on public.live_room_access;
create policy "live_room_access_admin_insert" on public.live_room_access
  for insert to authenticated with check (public.is_admin_user());

drop policy if exists "live_room_access_admin_delete" on public.live_room_access;
create policy "live_room_access_admin_delete" on public.live_room_access
  for delete to authenticated using (public.is_admin_user());

-- Estado da sala para o usuário logado: se tem acesso, o horário e — só para
-- quem tem acesso — o link.
create or replace function public.get_live_room()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_access boolean;
  v_cfg    live_room_config%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  v_access := public.is_staff()
           or exists (select 1 from live_room_access where user_id = v_uid);

  select * into v_cfg from live_room_config where id = 1;

  return jsonb_build_object(
    'has_access', v_access,
    'configured', coalesce(nullif(trim(v_cfg.url), ''), '') <> '',
    'schedule',   v_cfg.schedule,
    'url',        case when v_access then nullif(trim(v_cfg.url), '') end
  );
end $$;

revoke all on function public.get_live_room() from public, anon;
grant execute on function public.get_live_room() to authenticated;

commit;
