ALTER TABLE public.handbot_params
  ADD COLUMN IF NOT EXISTS include_manual_trades boolean NOT NULL DEFAULT false;
