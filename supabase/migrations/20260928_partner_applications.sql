-- ============================================================
-- Solicitações do Programa de Parceiros enviadas pelo formulário da landing.
--
-- A landing não grava direto: envia para a edge function partner-apply, que
-- valida, aplica limite por IP e insere com service role. Por isso não há
-- policy de insert — ninguém grava pela API pública.
-- Staff (admin/first_mate) lê, atualiza o status e apaga no Painel Admin ›
-- Parceiros.
--
-- Depende de is_staff() (20260926_security_hardening). Idempotente.
-- ============================================================

begin;

create table if not exists public.partner_applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  email       text not null check (char_length(email) between 5 and 200),
  phone       text not null check (char_length(phone) between 8 and 30),
  message     text check (message is null or char_length(message) <= 2000),
  status      text not null default 'new' check (status in ('new', 'contacted', 'approved', 'rejected')),
  ip_hash     text,                          -- sha256(ip + salt): só para o limite de envios
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists partner_applications_created_idx on public.partner_applications (created_at desc);
create index if not exists partner_applications_ip_idx on public.partner_applications (ip_hash, created_at desc);

alter table public.partner_applications enable row level security;

drop policy if exists "partner_applications_staff_select" on public.partner_applications;
create policy "partner_applications_staff_select" on public.partner_applications
  for select to authenticated using (public.is_staff());

drop policy if exists "partner_applications_staff_update" on public.partner_applications;
create policy "partner_applications_staff_update" on public.partner_applications
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "partner_applications_staff_delete" on public.partner_applications;
create policy "partner_applications_staff_delete" on public.partner_applications
  for delete to authenticated using (public.is_staff());

revoke all on public.partner_applications from anon;

commit;
