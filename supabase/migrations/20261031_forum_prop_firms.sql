-- ============================================================
-- Fórum + Mesas Proprietárias.
--
-- 1) Fórum: categorias (staff gerencia), tópicos e respostas. Qualquer logado
--    lê e posta; autor edita/apaga o próprio; staff modera (fixar, trancar,
--    apagar qualquer um). O nome do autor é gravado no post por trigger — a
--    tabela profiles continua fechada (só o próprio usuário/staff a leem).
-- 2) prop_firms: catálogo de mesas proprietárias. Logados leem as ativas;
--    só admin grava.
--
-- Depende de is_staff() / is_admin_user() (20260926_security_hardening).
-- Idempotente. Rodar no SQL Editor.
-- ============================================================

begin;

-- ─── Fórum ─────────────────────────────────────────────────────────────────

create table if not exists public.forum_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.forum_categories (slug, name, description, sort_order) values
  ('geral',        'Geral',                'Apresentações e conversas gerais da comunidade.', 1),
  ('analises',     'Análises de mercado',  'Leituras, cenários e ideias sobre os ativos.',   2),
  ('robos',        'Robôs e plataforma',   'Dúvidas e dicas sobre os robôs e o app.',        3),
  ('mesas',        'Mesas proprietárias',  'Aprovações, regras, payouts e estratégias.',     4),
  ('psicologia',   'Gestão e psicologia',  'Risco, disciplina e rotina de trader.',          5)
on conflict (slug) do nothing;

create table if not exists public.forum_topics (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.forum_categories(id) on delete cascade,
  author_id     uuid not null references auth.users(id) on delete cascade,
  author_name   text not null default 'Usuário',
  author_role   text,
  title         text not null check (char_length(trim(title)) between 3 and 140),
  body          text not null check (char_length(trim(body)) between 1 and 10000),
  is_pinned     boolean not null default false,
  is_locked     boolean not null default false,
  reply_count   int not null default 0,
  last_reply_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists forum_topics_list_idx
  on public.forum_topics (category_id, is_pinned desc, last_reply_at desc);
create index if not exists forum_topics_recent_idx
  on public.forum_topics (is_pinned desc, last_reply_at desc);

create table if not exists public.forum_posts (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.forum_topics(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Usuário',
  author_role text,
  body        text not null check (char_length(trim(body)) between 1 and 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists forum_posts_topic_idx on public.forum_posts (topic_id, created_at);

-- Autor sempre = quem chamou; nome/papel vêm do perfil (não do client).
-- Em UPDATE, autor e moderação (fixar/trancar) só mudam por staff.
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
    -- Atualização vinda do forum_posts_counter (trigger dentro de trigger):
    -- só mexe em reply_count/last_reply_at, então passa como está.
    if pg_trigger_depth() > 1 then
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

drop trigger if exists forum_topics_author_guard on public.forum_topics;
create trigger forum_topics_author_guard before insert or update on public.forum_topics
  for each row execute function public.forum_author_guard();

drop trigger if exists forum_posts_author_guard on public.forum_posts;
create trigger forum_posts_author_guard before insert or update on public.forum_posts
  for each row execute function public.forum_author_guard();

-- Contador de respostas e "última atividade" do tópico.
create or replace function public.forum_posts_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update forum_topics
       set reply_count = reply_count + 1, last_reply_at = new.created_at
     where id = new.topic_id;
  elsif tg_op = 'DELETE' then
    update forum_topics
       set reply_count = greatest(reply_count - 1, 0),
           last_reply_at = coalesce(
             (select max(created_at) from forum_posts where topic_id = old.topic_id),
             created_at)
     where id = old.topic_id;
  end if;
  return null;
end $$;

drop trigger if exists forum_posts_counter on public.forum_posts;
create trigger forum_posts_counter after insert or delete on public.forum_posts
  for each row execute function public.forum_posts_counter();

-- RLS
alter table public.forum_categories enable row level security;
alter table public.forum_topics     enable row level security;
alter table public.forum_posts      enable row level security;

drop policy if exists "forum_categories_select" on public.forum_categories;
create policy "forum_categories_select" on public.forum_categories
  for select to authenticated using (true);
drop policy if exists "forum_categories_staff_all" on public.forum_categories;
create policy "forum_categories_staff_all" on public.forum_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "forum_topics_select" on public.forum_topics;
create policy "forum_topics_select" on public.forum_topics
  for select to authenticated using (true);
drop policy if exists "forum_topics_insert" on public.forum_topics;
create policy "forum_topics_insert" on public.forum_topics
  for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "forum_topics_update" on public.forum_topics;
create policy "forum_topics_update" on public.forum_topics
  for update to authenticated
  using (auth.uid() = author_id or public.is_staff())
  with check (auth.uid() = author_id or public.is_staff());
drop policy if exists "forum_topics_delete" on public.forum_topics;
create policy "forum_topics_delete" on public.forum_topics
  for delete to authenticated using (auth.uid() = author_id or public.is_staff());

drop policy if exists "forum_posts_select" on public.forum_posts;
create policy "forum_posts_select" on public.forum_posts
  for select to authenticated using (true);
-- Resposta só em tópico destrancado (staff responde mesmo trancado).
drop policy if exists "forum_posts_insert" on public.forum_posts;
create policy "forum_posts_insert" on public.forum_posts
  for insert to authenticated with check (
    auth.uid() is not null and (
      public.is_staff()
      or exists (select 1 from forum_topics t where t.id = topic_id and not t.is_locked)
    )
  );
drop policy if exists "forum_posts_update" on public.forum_posts;
create policy "forum_posts_update" on public.forum_posts
  for update to authenticated
  using (auth.uid() = author_id or public.is_staff())
  with check (auth.uid() = author_id or public.is_staff());
drop policy if exists "forum_posts_delete" on public.forum_posts;
create policy "forum_posts_delete" on public.forum_posts
  for delete to authenticated using (auth.uid() = author_id or public.is_staff());

-- ─── Mesas proprietárias ───────────────────────────────────────────────────

create table if not exists public.prop_firms (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  website             text,
  logo_url            text,
  description         text,
  markets             text[] not null default '{}',   -- ex.: {Forex, Índices, Futuros}
  platforms           text[] not null default '{}',   -- ex.: {MT5, cTrader}
  -- Planos: [{ "size": 100000, "price": 549, "currency": "USD" }, ...]
  plans               jsonb not null default '[]'::jsonb,
  evaluation_steps    smallint,                         -- 0 = conta direta, 1, 2...
  profit_target_pct   numeric(5,2),                     -- meta da fase 1
  daily_drawdown_pct  numeric(5,2),
  max_drawdown_pct    numeric(5,2),
  profit_split_pct    numeric(5,2),
  payout_frequency    text,                             -- ex.: "Quinzenal"
  max_accounts        int,                              -- contas simultâneas permitidas
  rating              numeric(2,1) check (rating between 0 and 5),
  is_active           boolean not null default true,
  sort_order          int not null default 0,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

alter table public.prop_firms enable row level security;

drop policy if exists "prop_firms_select" on public.prop_firms;
create policy "prop_firms_select" on public.prop_firms
  for select to authenticated using (is_active or public.is_admin_user());
drop policy if exists "prop_firms_admin_all" on public.prop_firms;
create policy "prop_firms_admin_all" on public.prop_firms
  for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());

commit;
