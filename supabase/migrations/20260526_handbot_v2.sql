-- Hand Bot v2: adiciona colunas de Grid à Favor, Grid Contra e Barra-a-Barra

alter table public.handbot_params
  -- Grid à Favor
  add column if not exists grid_ahead_enabled     boolean  not null default false,
  add column if not exists grid_ahead_distance    numeric(10,1) not null default 550.0,
  add column if not exists grid_ahead_multiplier  numeric(10,2) not null default 1.1,

  -- Grid Contra
  add column if not exists grid_contra_enabled    boolean  not null default false,
  add column if not exists grid_contra_lot        numeric(10,2) not null default 0.01,
  add column if not exists grid_contra_distance   numeric(10,1) not null default 60.0,
  add column if not exists grid_contra_multiplier numeric(10,2) not null default 1.0,
  add column if not exists grid_contra_max_orders integer  not null default 200,

  -- Atualização de Stop e Entrada Barra-a-Barra
  add column if not exists bar_folga_stop         integer  not null default 50,
  add column if not exists bar_trailing_enabled   boolean  not null default false,
  add column if not exists bar_refresh_entry      boolean  not null default false;
