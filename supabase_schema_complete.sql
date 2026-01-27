
-- ==========================================
-- FASE 1-3: Estrutura Base (Users, Products, Licenses)
-- ==========================================

-- Check if Profiles exists to avoid errors on re-run
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text check (role in ('admin', 'client', 'partner')) default 'client',
  mt5_account text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Policies for Profiles (Using "do nothing" on conflict if policy exists is hard in raw SQL, dropping to ensure clean slate or ignoring error manually)
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Create Products Table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  type text check (type in ('ea', 'course')) not null,
  title text not null,
  description text,
  image_url text,
  external_link text,
  price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Products
alter table public.products enable row level security;

-- Policies for Products
drop policy if exists "Products are viewable by everyone." on public.products;
create policy "Products are viewable by everyone." on public.products for select using (true);

drop policy if exists "Only admins can insert/update products." on public.products;
create policy "Only admins can insert/update products." on public.products for all using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- Create License Requests Table
create table if not exists public.license_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  product_id uuid references public.products(id),
  product_name text,
  mt5_account text not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Licenses
alter table public.license_requests enable row level security;

-- Policies for Licenses
drop policy if exists "Users can view their own requests." on public.license_requests;
create policy "Users can view their own requests." on public.license_requests for select using (auth.uid() = user_id);

drop policy if exists "Users can create requests." on public.license_requests;
create policy "Users can create requests." on public.license_requests for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can view all requests." on public.license_requests;
create policy "Admins can view all requests." on public.license_requests for select using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update requests." on public.license_requests;
create policy "Admins can update requests." on public.license_requests for update using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- User Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'client');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication error
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================
-- FASE 4: Módulos e Aulas (Extensions)
-- ==========================================

-- Create modules table
create table if not exists modules (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  title text not null,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Modules
alter table modules enable row level security;

drop policy if exists "Modules are viewable by everyone" on modules;
create policy "Modules are viewable by everyone" on modules for select using ( true );

drop policy if exists "Modules are editable by admins only" on modules;
create policy "Modules are editable by admins only" on modules for all using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
);

-- Create lessons table
create table if not exists lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references modules(id) on delete cascade not null,
  title text not null,
  video_url text,
  duration text,
  is_free boolean default false,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Lessons
alter table lessons enable row level security;

drop policy if exists "Lessons are viewable by everyone" on lessons;
create policy "Lessons are viewable by everyone" on lessons for select using ( true );

drop policy if exists "Lessons are editable by admins only" on lessons;
create policy "Lessons are editable by admins only" on lessons for all using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
);
