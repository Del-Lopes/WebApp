
-- Adicionar coluna de metadados para flexibilidade (guardar versão, par, status, etc)
alter table public.products 
add column if not exists metadata jsonb default '{}'::jsonb;
