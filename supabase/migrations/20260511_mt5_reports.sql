-- Migration: Análise de Resultados — relatórios do MetaTrader 5
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Tabela mestre: 1 linha por upload de relatório
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mt5_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status do processamento
  status          text NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'ready', 'failed')),
  error_message   text,

  -- Cabeçalho extraído do relatório
  account_number  text,
  account_name    text,
  broker          text,
  currency        text,
  account_type    text,
  report_date     timestamptz,

  -- Métricas (extraídas direto do bloco "Resultados" do MT5)
  net_profit                  numeric(20, 4),
  gross_profit                numeric(20, 4),
  gross_loss                  numeric(20, 4),
  profit_factor               numeric(12, 4),
  expected_payoff             numeric(12, 4),
  recovery_factor             numeric(12, 4),
  sharpe_ratio                numeric(12, 4),
  absolute_drawdown           numeric(20, 4),
  max_drawdown                numeric(20, 4),
  max_drawdown_percent        numeric(8, 4),
  relative_drawdown_percent   numeric(8, 4),
  total_trades                integer,
  short_trades                integer,
  short_trades_won_percent    numeric(8, 4),
  long_trades                 integer,
  long_trades_won_percent     numeric(8, 4),
  profit_trades               integer,
  profit_trades_percent       numeric(8, 4),
  loss_trades                 integer,
  loss_trades_percent         numeric(8, 4),
  largest_profit              numeric(20, 4),
  largest_loss                numeric(20, 4),
  average_profit              numeric(20, 4),
  average_loss                numeric(20, 4),

  -- Arquivo no Storage
  storage_path    text NOT NULL,
  file_name       text NOT NULL,
  file_size       integer,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mt5_reports_user_created_idx
  ON public.mt5_reports (user_id, created_at DESC);

-- ============================================================
-- 2. Tabela de trades: 1 linha por posição fechada do relatório
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mt5_trades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid NOT NULL REFERENCES public.mt5_reports(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  position_id     text,
  symbol          text NOT NULL,
  side            text NOT NULL CHECK (side IN ('buy', 'sell')),
  volume          numeric(18, 4) NOT NULL,
  open_time       timestamptz NOT NULL,
  open_price      numeric(20, 8) NOT NULL,
  stop_loss       numeric(20, 8),
  take_profit     numeric(20, 8),
  close_time      timestamptz,
  close_price     numeric(20, 8),
  commission      numeric(18, 4),
  swap            numeric(18, 4),
  profit          numeric(20, 4) NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mt5_trades_report_idx
  ON public.mt5_trades (report_id);
CREATE INDEX IF NOT EXISTS mt5_trades_user_symbol_idx
  ON public.mt5_trades (user_id, symbol);
CREATE INDEX IF NOT EXISTS mt5_trades_user_close_idx
  ON public.mt5_trades (user_id, close_time DESC);

-- ============================================================
-- 3. Trigger updated_at em mt5_reports (reaproveita função existente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mt5_reports_set_updated_at ON public.mt5_reports;
CREATE TRIGGER mt5_reports_set_updated_at
  BEFORE UPDATE ON public.mt5_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RLS — trader gerencia o próprio; admin/first_mate leem tudo
-- ============================================================
ALTER TABLE public.mt5_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt5_trades  ENABLE ROW LEVEL SECURITY;

-- mt5_reports
DROP POLICY IF EXISTS "mt5_reports_select_own_or_staff" ON public.mt5_reports;
CREATE POLICY "mt5_reports_select_own_or_staff" ON public.mt5_reports
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

DROP POLICY IF EXISTS "mt5_reports_insert_own" ON public.mt5_reports;
CREATE POLICY "mt5_reports_insert_own" ON public.mt5_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mt5_reports_update_own" ON public.mt5_reports;
CREATE POLICY "mt5_reports_update_own" ON public.mt5_reports
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mt5_reports_delete_own_or_staff" ON public.mt5_reports;
CREATE POLICY "mt5_reports_delete_own_or_staff" ON public.mt5_reports
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- mt5_trades — insert/update apenas via service_role (edge function);
-- usuário só lê os próprios trades
DROP POLICY IF EXISTS "mt5_trades_select_own_or_staff" ON public.mt5_trades;
CREATE POLICY "mt5_trades_select_own_or_staff" ON public.mt5_trades
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- ============================================================
-- 5. Storage bucket para os arquivos HTML
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('mt5-reports', 'mt5-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket
DROP POLICY IF EXISTS "mt5_reports_storage_insert_own" ON storage.objects;
CREATE POLICY "mt5_reports_storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mt5-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "mt5_reports_storage_select_own_or_staff" ON storage.objects;
CREATE POLICY "mt5_reports_storage_select_own_or_staff" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'mt5-reports'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
      )
    )
  );

DROP POLICY IF EXISTS "mt5_reports_storage_delete_own_or_staff" ON storage.objects;
CREATE POLICY "mt5_reports_storage_delete_own_or_staff" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mt5-reports'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
      )
    )
  );
