-- 1. Fix Partner Requests Foreign Key (to allow joining with profiles)
-- We need to drop the old FK pointing to auth.users and point to profiles for easier Supabase joins
ALTER TABLE public.partner_requests
DROP CONSTRAINT IF EXISTS partner_requests_user_id_fkey;

ALTER TABLE public.partner_requests
ADD CONSTRAINT partner_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. Create Education Tables (Modules, Lessons, Articles)
create table if not exists public.modules (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  title text not null,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  video_url text,
  duration text,
  is_free boolean default false,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  excerpt text,
  content text, -- Full text content
  image_url text,
  author text default 'Equipe Tradexperience',
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Update Marketing Assets for "Slide/Text" content
alter table public.marketing_assets 
add column if not exists content text; -- To store the text/article content directly

alter table public.marketing_assets 
add column if not exists image_url text; -- Specific image for the cover if needed distinct from 'url' (download link)

-- 4. Enable RLS for new/updated tables
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.articles enable row level security;

-- 5. Policies (Read Publicly, Admin Write)
-- Modules
create policy "Public Read Modules" on public.modules for select using (true);
create policy "Admin Write Modules" on public.modules for all using (auth.uid() in (select id from profiles where role = 'admin'));

-- Lessons
create policy "Public Read Lessons" on public.lessons for select using (true);
create policy "Admin Write Lessons" on public.lessons for all using (auth.uid() in (select id from profiles where role = 'admin'));

-- Articles
create policy "Public Read Articles" on public.articles for select using (true);
create policy "Admin Write Articles" on public.articles for all using (auth.uid() in (select id from profiles where role = 'admin'));

-- 6. Add description to lessons
alter table public.lessons
add column if not exists description text;
