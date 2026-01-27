
-- 1. Adicionar coluna de email na tabela profiles
alter table public.profiles 
add column if not exists email text;

-- 2. Atualizar a função que cria usuários para salvar o email também
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    'client',
    new.email -- Agora salvamos o email
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3. Preencher os emails dos usuários que já existem
-- (Copia da tabela auth.users para public.profiles)
update public.profiles
set email = auth.users.email
from auth.users
where public.profiles.id = auth.users.id;
