-- Migration: marca contas da Tesouraria como "cent" (contas de centavos).
-- Quando is_cent = true, o mt5-ingest divide o equity recebido por 100
-- antes de gravar em treasury_accounts.balance.

ALTER TABLE public.treasury_accounts
  ADD COLUMN IF NOT EXISTS is_cent boolean NOT NULL DEFAULT false;
