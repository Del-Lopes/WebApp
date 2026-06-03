-- Adiciona parâmetros Reset Global e Hedge Dinâmico ao handbot_params
ALTER TABLE public.handbot_params
  ADD COLUMN IF NOT EXISTS reset_value_to_add    double precision NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS dynamic_hedge_enabled  boolean          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dynamic_hedge_percent  double precision NOT NULL DEFAULT 1.0;
