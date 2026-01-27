
-- Create modules table
create table if not exists modules (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  title text not null,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
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

-- RLS Policies for modules
alter table modules enable row level security;

create policy "Modules are viewable by everyone"
  on modules for select
  using ( true );

create policy "Modules are editable by admins only"
  on modules for all
  using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- RLS Policies for lessons
alter table lessons enable row level security;

create policy "Lessons are viewable by everyone"
  on lessons for select
  using ( true );

create policy "Lessons are editable by admins only"
  on lessons for all
  using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to handle new user role updates security check
-- (Ensuring profiles policies are robust is already done in phase 1)
