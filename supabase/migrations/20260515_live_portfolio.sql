-- Migration: Live Portfólio (cliente-facing)
-- Cada usuário gerencia suas próprias contas MT5 com telemetria ao vivo.
-- Stack isolado do strategy_mt5_* (admins) e do treasury_mt5_* (admins/first_mate).
--
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Conta do portfólio (criada pelo próprio usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name            text NOT NULL,
  broker_display  text,
  notes           text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_accounts_user_idx
  ON public.portfolio_accounts (user_id);

-- ============================================================
-- 2. Vínculo conta portfólio ↔ conta MT5 + chave de API (hashed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio_mt5_link (
  account_id         uuid PRIMARY KEY REFERENCES public.portfolio_accounts(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  account_login      bigint NOT NULL,

  -- Chave de API: armazenamos somente o hash SHA-256 (em hex).
  api_key_hash       text NOT NULL UNIQUE,
  api_key_prefix     text NOT NULL,
  api_key_created_at timestamptz NOT NULL DEFAULT now(),
  api_key_revoked_at timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_mt5_link_user_idx
  ON public.portfolio_mt5_link (user_id);
CREATE INDEX IF NOT EXISTS portfolio_mt5_link_account_login_idx
  ON public.portfolio_mt5_link (account_login);

-- ============================================================
-- 3. Snapshot mais recente (UPSERT a cada envio do EA)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio_mt5_status (
  account_id         uuid PRIMARY KEY REFERENCES public.portfolio_mt5_link(account_id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  account_login      bigint NOT NULL,
  account_currency   text,
  account_company    text,
  account_server     text,

  balance            numeric(20, 4),
  equity             numeric(20, 4),
  floating_pnl       numeric(20, 4),
  daily_pnl          numeric(20, 4),
  open_positions     integer,
  last_trade_at      timestamptz,

  ea_version         text,
  terminal_hash      text,

  reported_at        timestamptz NOT NULL,
  received_at        timestamptz NOT NULL DEFAULT now(),

  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_mt5_status_user_idx
  ON public.portfolio_mt5_status (user_id);

-- ============================================================
-- 4. Triggers updated_at (reusa função set_updated_at criada em 20260511)
-- ============================================================
DROP TRIGGER IF EXISTS portfolio_accounts_set_updated_at ON public.portfolio_accounts;
CREATE TRIGGER portfolio_accounts_set_updated_at
  BEFORE UPDATE ON public.portfolio_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS portfolio_mt5_link_set_updated_at ON public.portfolio_mt5_link;
CREATE TRIGGER portfolio_mt5_link_set_updated_at
  BEFORE UPDATE ON public.portfolio_mt5_link
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS portfolio_mt5_status_set_updated_at ON public.portfolio_mt5_status;
CREATE TRIGGER portfolio_mt5_status_set_updated_at
  BEFORE UPDATE ON public.portfolio_mt5_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. RLS — cada usuário acessa SOMENTE os próprios registros.
--    Escrita em status só via service_role (edge function).
-- ============================================================
ALTER TABLE public.portfolio_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_mt5_link   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_mt5_status ENABLE ROW LEVEL SECURITY;

-- portfolio_accounts
DROP POLICY IF EXISTS "portfolio_accounts_select_own" ON public.portfolio_accounts;
CREATE POLICY "portfolio_accounts_select_own" ON public.portfolio_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfolio_accounts_insert_own" ON public.portfolio_accounts;
CREATE POLICY "portfolio_accounts_insert_own" ON public.portfolio_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfolio_accounts_update_own" ON public.portfolio_accounts;
CREATE POLICY "portfolio_accounts_update_own" ON public.portfolio_accounts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfolio_accounts_delete_own" ON public.portfolio_accounts;
CREATE POLICY "portfolio_accounts_delete_own" ON public.portfolio_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- portfolio_mt5_link
DROP POLICY IF EXISTS "portfolio_mt5_link_select_own" ON public.portfolio_mt5_link;
CREATE POLICY "portfolio_mt5_link_select_own" ON public.portfolio_mt5_link
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfolio_mt5_link_insert_own" ON public.portfolio_mt5_link;
CREATE POLICY "portfolio_mt5_link_insert_own" ON public.portfolio_mt5_link
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfolio_mt5_link_update_own" ON public.portfolio_mt5_link;
CREATE POLICY "portfolio_mt5_link_update_own" ON public.portfolio_mt5_link
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfolio_mt5_link_delete_own" ON public.portfolio_mt5_link;
CREATE POLICY "portfolio_mt5_link_delete_own" ON public.portfolio_mt5_link
  FOR DELETE USING (auth.uid() = user_id);

-- portfolio_mt5_status (somente leitura pelo dono)
DROP POLICY IF EXISTS "portfolio_mt5_status_select_own" ON public.portfolio_mt5_status;
CREATE POLICY "portfolio_mt5_status_select_own" ON public.portfolio_mt5_status
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 6. Realtime — habilita stream de status pro frontend
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_mt5_status;
