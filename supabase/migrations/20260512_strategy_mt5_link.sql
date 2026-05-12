-- Migration: Vínculo entre estratégia (products type='ea') e conta MT5
-- O EA TradexperienceMonitor envia telemetria para a edge function mt5-ingest,
-- que persiste em strategy_mt5_status (snapshot) e strategy_mt5_history (série temporal).
--
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Vínculo estratégia ↔ conta MT5 + chave de API (hashed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.strategy_mt5_link (
  strategy_id        uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  account_login      bigint NOT NULL,
  broker_display     text,

  -- Chave de API: armazenamos somente o hash SHA-256 (em hex).
  -- O valor em texto plano só existe no MT5 do usuário.
  api_key_hash       text NOT NULL UNIQUE,
  api_key_prefix     text NOT NULL,  -- 8 primeiros chars pra exibição mascarada ("txp_live_a3f9...")
  api_key_created_at timestamptz NOT NULL DEFAULT now(),
  api_key_revoked_at timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategy_mt5_link_user_idx
  ON public.strategy_mt5_link (user_id);
CREATE INDEX IF NOT EXISTS strategy_mt5_link_account_idx
  ON public.strategy_mt5_link (account_login);

-- ============================================================
-- 2. Snapshot mais recente (UPSERT a cada envio do EA)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.strategy_mt5_status (
  strategy_id        uuid PRIMARY KEY REFERENCES public.strategy_mt5_link(strategy_id) ON DELETE CASCADE,
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

  -- Quando o EA reportou (vem no payload) vs. quando o servidor recebeu
  reported_at        timestamptz NOT NULL,
  received_at        timestamptz NOT NULL DEFAULT now(),

  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategy_mt5_status_user_idx
  ON public.strategy_mt5_status (user_id);

-- ============================================================
-- 3. Série temporal (1 linha por minuto pra gráficos)
-- A edge function só insere se passou >=60s do último insert dessa estratégia.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.strategy_mt5_history (
  id            bigserial PRIMARY KEY,
  strategy_id   uuid NOT NULL REFERENCES public.strategy_mt5_link(strategy_id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  equity         numeric(20, 4),
  balance        numeric(20, 4),
  floating_pnl   numeric(20, 4),
  daily_pnl      numeric(20, 4),
  open_positions integer,

  recorded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategy_mt5_history_strategy_recorded_idx
  ON public.strategy_mt5_history (strategy_id, recorded_at DESC);

-- ============================================================
-- 4. Trigger updated_at (reusa função set_updated_at criada em 20260511)
-- ============================================================
DROP TRIGGER IF EXISTS strategy_mt5_link_set_updated_at ON public.strategy_mt5_link;
CREATE TRIGGER strategy_mt5_link_set_updated_at
  BEFORE UPDATE ON public.strategy_mt5_link
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS strategy_mt5_status_set_updated_at ON public.strategy_mt5_status;
CREATE TRIGGER strategy_mt5_status_set_updated_at
  BEFORE UPDATE ON public.strategy_mt5_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. RLS
--    - link: dono lê/insere/deleta o próprio; admin/first_mate veem tudo.
--      A chave em texto plano nunca trafega — só o hash, e nem ele precisa
--      sair pra o frontend (frontend exibe api_key_prefix).
--    - status/history: dono lê o próprio; admin/first_mate veem tudo.
--      Escrita SOMENTE via service_role (edge function).
-- ============================================================
ALTER TABLE public.strategy_mt5_link    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_mt5_status  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_mt5_history ENABLE ROW LEVEL SECURITY;

-- strategy_mt5_link
DROP POLICY IF EXISTS "strategy_mt5_link_select_own_or_staff" ON public.strategy_mt5_link;
CREATE POLICY "strategy_mt5_link_select_own_or_staff" ON public.strategy_mt5_link
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

DROP POLICY IF EXISTS "strategy_mt5_link_insert_own" ON public.strategy_mt5_link;
CREATE POLICY "strategy_mt5_link_insert_own" ON public.strategy_mt5_link
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "strategy_mt5_link_update_own" ON public.strategy_mt5_link;
CREATE POLICY "strategy_mt5_link_update_own" ON public.strategy_mt5_link
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "strategy_mt5_link_delete_own_or_staff" ON public.strategy_mt5_link;
CREATE POLICY "strategy_mt5_link_delete_own_or_staff" ON public.strategy_mt5_link
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- strategy_mt5_status (leitura)
DROP POLICY IF EXISTS "strategy_mt5_status_select_own_or_staff" ON public.strategy_mt5_status;
CREATE POLICY "strategy_mt5_status_select_own_or_staff" ON public.strategy_mt5_status
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- strategy_mt5_history (leitura)
DROP POLICY IF EXISTS "strategy_mt5_history_select_own_or_staff" ON public.strategy_mt5_history;
CREATE POLICY "strategy_mt5_history_select_own_or_staff" ON public.strategy_mt5_history
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- ============================================================
-- 6. Realtime — habilita stream de status pro frontend
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.strategy_mt5_status;

-- ============================================================
-- 7. Limpeza periódica do histórico (>7 dias) via pg_cron
--    Comentado: depende do pg_cron estar habilitado no projeto.
--    Habilite executando manualmente quando quiser:
-- ============================================================
-- SELECT cron.schedule(
--   'strategy_mt5_history_cleanup',
--   '0 4 * * *',
--   $$ DELETE FROM public.strategy_mt5_history WHERE recorded_at < now() - interval '7 days' $$
-- );
