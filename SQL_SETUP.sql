-- Execute these SQL commands in your Supabase SQL Editor to enable the new features

-- 1. Create Marketing Assets table
create table if not exists public.marketing_assets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text not null, -- 'PDF', 'Slide', 'Image'
  size text,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Partner Requests table
create table if not exists public.partner_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.marketing_assets enable row level security;
alter table public.partner_requests enable row level security;

-- 4. Create RLS Policies

-- Marketing Assets: Everyone can read, only Admins can write
create policy "Public Read Marketing" on public.marketing_assets
  for select using (true);

create policy "Admin Insert Marketing" on public.marketing_assets
  for insert with check (
    auth.uid() in (select id from profiles where role = 'admin')
  );

create policy "Admin Delete Marketing" on public.marketing_assets
  for delete using (
    auth.uid() in (select id from profiles where role = 'admin')
  );

-- Partner Requests: Users can see/create their own, Admins can view/update all
create policy "Users manage own requests" on public.partner_requests
  for all using (auth.uid() = user_id);

create policy "Admins view all requests" on public.partner_requests
  for select using (
    auth.uid() in (select id from profiles where role = 'admin')
  );

create policy "Admins update requests" on public.partner_requests
  for update using (
    auth.uid() in (select id from profiles where role = 'admin')
  );
