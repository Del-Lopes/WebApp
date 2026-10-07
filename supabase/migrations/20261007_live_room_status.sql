-- Status "Estamos ao vivo" da Sala ao Vivo.
-- Execute após 20260927_live_room.sql.

begin;

alter table public.live_room_config
  add column if not exists is_live boolean not null default false;

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
    'is_live',    coalesce(v_cfg.is_live, false),
    'schedule',   v_cfg.schedule,
    'url',        case when v_access then nullif(trim(v_cfg.url), '') end
  );
end $$;

revoke all on function public.get_live_room() from public, anon;
grant execute on function public.get_live_room() to authenticated;

commit;
