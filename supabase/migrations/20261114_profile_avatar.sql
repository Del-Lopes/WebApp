-- ============================================================
-- Foto de perfil.
--
-- A imagem vai para o mesmo bucket R2 das imagens do Fórum (forum-image-upload),
-- que valida login, tipo e tamanho. Aqui guardamos só a CHAVE do arquivo.
--
-- profiles só é legível pelo dono e pela equipe (profiles_select_own_or_staff),
-- então os outros usuários (ex.: no Fórum) pedem a foto por uma função que
-- devolve apenas id → chave, e nenhuma outra coluna do perfil.
-- Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

alter table public.profiles add column if not exists avatar_key text;

-- A chave precisa ser de um arquivo enviado pelo próprio usuário (a chave começa com o id dele)
-- e ter o formato gerado pelo upload: ninguém aponta o perfil para um arquivo alheio ou para uma URL.
alter table public.profiles drop constraint if exists profiles_avatar_key_format;
alter table public.profiles add constraint profiles_avatar_key_format check (
  avatar_key is null
  or (avatar_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$'
      and avatar_key like id::text || '/%')
);

create or replace function public.forum_avatars(p_ids uuid[])
returns table (id uuid, avatar_key text)
language sql stable security definer set search_path = public as $$
  select p.id, p.avatar_key
    from public.profiles p
   where p.id = any (p_ids[1:100])
     and p.avatar_key is not null;
$$;

revoke all on function public.forum_avatars(uuid[]) from public, anon;
grant execute on function public.forum_avatars(uuid[]) to authenticated;

commit;
