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
  -- Timeframe como inteiro (valor numérico do ENUM_TIMEFRAMES do MT5).
  -- 0 = PERIOD_CURRENT, 1 = M1, 5 = M5, 15 = M15, 30 = M30,
  -- 16385 = H1, 16386 = H2, 16387 = H3, 16388 = H4,
  -- 16390 = H6, 16392 = H8, 16396 = H12, 16408 = D1, 32769 = W1, 49153 = MN1
  add column if not exists bar_timeframe          integer  not null default 0,
  add column if not exists bar_refresh_entry      boolean  not null default false;
