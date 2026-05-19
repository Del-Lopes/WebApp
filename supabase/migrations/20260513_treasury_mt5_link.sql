-- Migration: Vínculo entre conta de tesouraria (treasury_accounts) e conta MT5.
-- O EA TradexperienceTreasury envia somente equity para mt5-ingest, que ao
-- reconhecer um token de tesouraria atualiza treasury_accounts.balance.
--
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Vínculo conta tesouraria ↔ conta MT5 + chave de API (hashed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.treasury_mt5_link (
  account_id         uuid PRIMARY KEY REFERENCES public.treasury_accounts(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  account_login      bigint NOT NULL,
  broker_display     text,

  -- Mesmo esquema do strategy_mt5_link: armazenamos só o SHA-256 hex da chave.
  api_key_hash       text NOT NULL UNIQUE,
  api_key_prefix     text NOT NULL,
  api_key_created_at timestamptz NOT NULL DEFAULT now(),
  api_key_revoked_at timestamptz,

  last_equity        numeric(20, 4),
  last_reported_at   timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treasury_mt5_link_user_idx
  ON public.treasury_mt5_link (user_id);
CREATE INDEX IF NOT EXISTS treasury_mt5_link_account_login_idx
  ON public.treasury_mt5_link (account_login);

-- ============================================================
-- 2. Trigger updated_at (reusa função set_updated_at criada em 20260511)
-- ============================================================
DROP TRIGGER IF EXISTS treasury_mt5_link_set_updated_at ON public.treasury_mt5_link;
CREATE TRIGGER treasury_mt5_link_set_updated_at
  BEFORE UPDATE ON public.treasury_mt5_link
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. RLS — somente admin/first_mate gerenciam vínculos de tesouraria
--    (a tesouraria é uma view administrativa, não de cliente final).
-- ============================================================
ALTER TABLE public.treasury_mt5_link ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treasury_mt5_link_select_staff" ON public.treasury_mt5_link;
CREATE POLICY "treasury_mt5_link_select_staff" ON public.treasury_mt5_link
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

DROP POLICY IF EXISTS "treasury_mt5_link_insert_staff" ON public.treasury_mt5_link;
CREATE POLICY "treasury_mt5_link_insert_staff" ON public.treasury_mt5_link
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

DROP POLICY IF EXISTS "treasury_mt5_link_update_staff" ON public.treasury_mt5_link;
CREATE POLICY "treasury_mt5_link_update_staff" ON public.treasury_mt5_link
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

DROP POLICY IF EXISTS "treasury_mt5_link_delete_staff" ON public.treasury_mt5_link;
CREATE POLICY "treasury_mt5_link_delete_staff" ON public.treasury_mt5_link
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );
