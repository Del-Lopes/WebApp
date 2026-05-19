-- Migration: libera leitura publica das tabelas de status do MT5 nas estrategias.
-- Motivo: a aba "Estrategias" e uma vitrine de divulgacao. Qualquer usuario
-- autenticado precisa ver o card de Conexao MT5 da estrategia (equity,
-- flutuante, P&L do dia, posicoes), independentemente de quem fez o link.
--
-- Mantemos as politicas de INSERT/UPDATE/DELETE inalteradas — somente o
-- dono (ou admin/first_mate) pode mexer.
--
-- Sobre seguranca:
--  - api_key_hash e um hash SHA-256 (irreversivel).
--  - api_key_prefix sao apenas 8 caracteres de display (ja exibidos na UI).
--  - account_login, equity, balance, P&L sao dados da estrategia que ja
--    seriam expostos no card de divulgacao.

-- ============================================================
-- strategy_mt5_link
-- ============================================================
DROP POLICY IF EXISTS "strategy_mt5_link_select_own_or_staff" ON public.strategy_mt5_link;
DROP POLICY IF EXISTS "strategy_mt5_link_select_authenticated" ON public.strategy_mt5_link;

CREATE POLICY "strategy_mt5_link_select_authenticated" ON public.strategy_mt5_link
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- strategy_mt5_status
-- ============================================================
DROP POLICY IF EXISTS "strategy_mt5_status_select_own_or_staff" ON public.strategy_mt5_status;
DROP POLICY IF EXISTS "strategy_mt5_status_select_authenticated" ON public.strategy_mt5_status;

CREATE POLICY "strategy_mt5_status_select_authenticated" ON public.strategy_mt5_status
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- strategy_mt5_history
-- ============================================================
DROP POLICY IF EXISTS "strategy_mt5_history_select_own_or_staff" ON public.strategy_mt5_history;
DROP POLICY IF EXISTS "strategy_mt5_history_select_authenticated" ON public.strategy_mt5_history;

CREATE POLICY "strategy_mt5_history_select_authenticated" ON public.strategy_mt5_history
  FOR SELECT
  TO authenticated
  USING (true);
