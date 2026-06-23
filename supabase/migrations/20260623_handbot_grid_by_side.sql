-- Separa os parâmetros de Grid à Favor e Grid Contra por lado (compra / venda)
-- Cada lado tem seu próprio toggle, distância, multiplicador e lote base.
ALTER TABLE public.handbot_params
  -- Grid à Favor - Compra
  ADD COLUMN IF NOT EXISTS grid_ahead_enabled_buy  boolean          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grid_ahead_distance_buy double precision NOT NULL DEFAULT 550.0,
  ADD COLUMN IF NOT EXISTS grid_ahead_multiplier_buy double precision NOT NULL DEFAULT 1.1,
  ADD COLUMN IF NOT EXISTS grid_ahead_lot_buy      double precision NOT NULL DEFAULT 0.01,
  -- Grid à Favor - Venda
  ADD COLUMN IF NOT EXISTS grid_ahead_enabled_sell  boolean          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grid_ahead_distance_sell double precision NOT NULL DEFAULT 550.0,
  ADD COLUMN IF NOT EXISTS grid_ahead_multiplier_sell double precision NOT NULL DEFAULT 1.1,
  ADD COLUMN IF NOT EXISTS grid_ahead_lot_sell      double precision NOT NULL DEFAULT 0.01,
  -- Grid Contra - Compra
  ADD COLUMN IF NOT EXISTS grid_contra_enabled_buy  boolean          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grid_contra_lot_buy      double precision NOT NULL DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS grid_contra_distance_buy double precision NOT NULL DEFAULT 60.0,
  ADD COLUMN IF NOT EXISTS grid_contra_multiplier_buy double precision NOT NULL DEFAULT 1.0,
  -- Grid Contra - Venda
  ADD COLUMN IF NOT EXISTS grid_contra_enabled_sell  boolean          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grid_contra_lot_sell      double precision NOT NULL DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS grid_contra_distance_sell double precision NOT NULL DEFAULT 60.0,
  ADD COLUMN IF NOT EXISTS grid_contra_multiplier_sell double precision NOT NULL DEFAULT 1.0;
