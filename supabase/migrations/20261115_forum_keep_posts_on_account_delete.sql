-- ============================================================
-- Fórum: as mensagens de quem exclui a conta PERMANECEM, de forma anônima.
--
-- Antes, forum_topics/forum_posts.author_id apontavam para auth.users com ON DELETE CASCADE:
-- excluir a conta apagava os tópicos e respostas do usuário (e, junto, as conversas dos outros).
-- Agora:
--   1. author_id aceita NULL e a FK vira ON DELETE SET NULL;
--   2. um trigger em auth.users, antes da exclusão, troca o nome exibido por "Usuário excluído" e tira o papel
--      (sem nome e sem foto: a foto vem de profiles.avatar_key, que some com o perfil);
--   3. o guard do Fórum deixa passar atualizações feitas pelo servidor (sem auth.uid()), que é o caso da
--      exclusão de conta pela edge function delete-account, pelo painel do Supabase ou pelo SQL Editor.
-- Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

alter table public.forum_topics alter column author_id drop not null;
alter table public.forum_posts  alter column author_id drop not null;

alter table public.forum_topics drop constraint if exists forum_topics_author_id_fkey;
alter table public.forum_topics add constraint forum_topics_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

alter table public.forum_posts drop constraint if exists forum_posts_author_id_fkey;
alter table public.forum_posts add constraint forum_posts_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

-- Mesmo guard de antes, com uma saída para o servidor em UPDATE (sem usuário logado).
create or replace function public.forum_author_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_role text;
begin
  if tg_op = 'INSERT' then
    select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1), 'Usuário'), role
      into v_name, v_role
      from profiles where id = auth.uid();
    new.author_id   := auth.uid();
    new.author_name := coalesce(v_name, 'Usuário');
    new.author_role := v_role;
    new.created_at  := now();
    new.updated_at  := now();
    if tg_table_name = 'forum_topics' then
      new.reply_count   := 0;
      new.last_reply_at := now();
      if not public.is_staff() then
        new.is_pinned := false;
        new.is_locked := false;
      end if;
    end if;
  else
    -- Atualização vinda do forum_posts_counter ou da ação ON DELETE SET NULL (trigger dentro de trigger).
    if pg_trigger_depth() > 1 then
      return new;
    end if;
    -- Servidor (service role, SQL Editor, anonimização na exclusão de conta): sem usuário logado, passa como está.
    if auth.uid() is null then
      return new;
    end if;
    new.author_id   := old.author_id;
    new.author_name := old.author_name;
    new.author_role := old.author_role;
    new.created_at  := old.created_at;
    new.updated_at  := now();
    if tg_table_name = 'forum_topics' then
      new.reply_count   := old.reply_count;
      new.last_reply_at := old.last_reply_at;
      if not public.is_staff() then
        new.is_pinned := old.is_pinned;
        new.is_locked := old.is_locked;
      end if;
    end if;
  end if;
  return new;
end $$;

-- Antes de o usuário sair de auth.users: tira nome e papel das mensagens dele.
create or replace function public.forum_anonymize_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.forum_topics set author_name = 'Usuário excluído', author_role = null where author_id = old.id;
  update public.forum_posts  set author_name = 'Usuário excluído', author_role = null where author_id = old.id;
  return old;
end $$;

drop trigger if exists on_auth_user_forum_anonymize on auth.users;
create trigger on_auth_user_forum_anonymize
  before delete on auth.users
  for each row execute function public.forum_anonymize_author();

commit;
