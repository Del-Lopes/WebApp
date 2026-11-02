-- ============================================================
-- Fórum: registro das imagens enviadas ao bucket R2 (Cloudflare).
--
-- Quem grava é a edge function forum-image-upload (service role), depois de
-- validar login, tipo e tamanho. A tabela serve para o limite diário por
-- usuário e para achar/limpar imagens órfãs. Sem policies: ninguém lê nem
-- escreve pelo navegador.
-- Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

create table if not exists public.forum_images (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  object_key text not null unique,
  bytes      integer not null check (bytes > 0),
  created_at timestamptz not null default now()
);

create index if not exists forum_images_user_day_idx on public.forum_images (user_id, created_at desc);
create index if not exists forum_images_created_idx on public.forum_images (created_at desc);

alter table public.forum_images enable row level security;

commit;
