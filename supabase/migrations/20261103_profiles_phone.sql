-- ============================================================
-- Telefone no cadastro de novos usuários.
--
-- O formulário envia o telefone no user_metadata do signUp. A gravação em
-- profiles é feita aqui no banco porque, com confirmação de e-mail ligada, o
-- signUp não devolve sessão e o upsert do navegador é barrado pela RLS.
--
-- Trigger próprio em vez de alterar handle_new_user: a versão de produção pode
-- não bater com a do repositório. Os triggers disparam em ordem alfabética, então
-- on_auth_user_phone roda depois de on_auth_user_created (que cria o profile).
--
-- Contas antigas ficam com phone nulo. A coluna é legível só pelo dono e por
-- staff (policy profiles_select_own_or_staff).
-- Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

alter table public.profiles add column if not exists phone text;

alter table public.profiles drop constraint if exists profiles_phone_length;
alter table public.profiles add constraint profiles_phone_length
  check (char_length(phone) between 10 and 30);

-- O metadata vem do cliente: telefone inválido é ignorado para não barrar o cadastro.
create or replace function public.handle_new_user_phone()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone text := btrim(new.raw_user_meta_data ->> 'phone');
begin
  if char_length(v_phone) <= 30
     and char_length(regexp_replace(v_phone, '\D', '', 'g')) between 10 and 15 then
    update profiles set phone = v_phone where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_phone on auth.users;
create trigger on_auth_user_phone
  after insert on auth.users
  for each row execute function public.handle_new_user_phone();

-- Cadastros feitos entre o deploy do front e a execução desta migration.
update public.profiles p
   set phone = btrim(u.raw_user_meta_data ->> 'phone')
  from auth.users u
 where u.id = p.id
   and p.phone is null
   and char_length(btrim(u.raw_user_meta_data ->> 'phone')) <= 30
   and char_length(regexp_replace(btrim(u.raw_user_meta_data ->> 'phone'), '\D', '', 'g')) between 10 and 15;

commit;
