-- ============================================================
-- Painel Admin › Storage: monitoramento do bucket R2 do Fórum.
--
-- Números vêm de forum_images (registrada por forum-image-upload), então
-- refletem o que passou pela plataforma; imagens apagadas direto no painel da
-- Cloudflare continuam contadas. Só staff executa.
-- Rodar DEPOIS de 20261106_forum_images.sql. Idempotente.
-- ============================================================

begin;

create or replace function public.admin_forum_images_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_month timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  return jsonb_build_object(
    'total_count', (select count(*) from forum_images),
    'total_bytes', (select coalesce(sum(bytes), 0) from forum_images),
    'count_24h',   (select count(*) from forum_images where created_at >= now() - interval '24 hours'),
    'count_7d',    (select count(*) from forum_images where created_at >= now() - interval '7 days'),
    'count_month', (select count(*) from forum_images where created_at >= v_month),
    'users',       (select count(distinct user_id) from forum_images),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'object_key', r.object_key,
               'bytes',      r.bytes,
               'created_at', r.created_at,
               'author',     r.author
             ) order by r.created_at desc), '[]'::jsonb)
        from (
          select f.object_key, f.bytes, f.created_at,
                 coalesce(nullif(p.full_name, ''), p.email) as author
            from forum_images f
            left join profiles p on p.id = f.user_id
           order by f.created_at desc
           limit 30
        ) r
    )
  );
end $$;

revoke all on function public.admin_forum_images_stats() from public, anon;
grant execute on function public.admin_forum_images_stats() to authenticated;

commit;
