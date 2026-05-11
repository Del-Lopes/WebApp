-- Migration: Diário de Operações dos Traders
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Tabela de operações registradas no diário
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trade_journal (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Operação
  asset           text NOT NULL CHECK (char_length(asset) BETWEEN 1 AND 30),
  side            text NOT NULL CHECK (side IN ('buy', 'sell')),
  volume          numeric(18, 4) NOT NULL CHECK (volume > 0),
  entry_price     numeric(20, 8),
  exit_price      numeric(20, 8),
  opened_at       timestamptz NOT NULL,
  closed_at       timestamptz,

  -- Resultado (em moeda; pips é calculado dinamicamente quando há preços)
  result_amount   numeric(18, 2),
  result_pips     numeric(18, 2), -- preenchido manualmente se preço não informado

  -- Reflexão
  entry_reason    text CHECK (char_length(entry_reason) <= 2000),
  exit_reason     text CHECK (char_length(exit_reason) <= 2000),
  analysis        text CHECK (char_length(analysis) <= 4000),
  emotional_tags  text[] NOT NULL DEFAULT '{}',
  emotional_note  text CHECK (char_length(emotional_note) <= 1000),
  rating          smallint CHECK (rating BETWEEN 1 AND 5),
  conclusion      text CHECK (char_length(conclusion) <= 2000),

  -- Mídia
  screenshot_url  text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Sanidade: closed_at não pode ser anterior a opened_at
  CONSTRAINT trade_journal_closed_after_opened CHECK (
    closed_at IS NULL OR closed_at >= opened_at
  )
);

CREATE INDEX IF NOT EXISTS trade_journal_user_opened_idx
  ON public.trade_journal (user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS trade_journal_user_asset_idx
  ON public.trade_journal (user_id, asset);

-- ============================================================
-- 2. Trigger updated_at (reaproveita função criada na migration de knowledge)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trade_journal_set_updated_at ON public.trade_journal;
CREATE TRIGGER trade_journal_set_updated_at
  BEFORE UPDATE ON public.trade_journal
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. RLS — usuário gerencia o próprio; admin/first_mate leem tudo
-- ============================================================
ALTER TABLE public.trade_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_journal_select_own_or_staff" ON public.trade_journal;
CREATE POLICY "trade_journal_select_own_or_staff" ON public.trade_journal
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

DROP POLICY IF EXISTS "trade_journal_insert_own" ON public.trade_journal;
CREATE POLICY "trade_journal_insert_own" ON public.trade_journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trade_journal_update_own" ON public.trade_journal;
CREATE POLICY "trade_journal_update_own" ON public.trade_journal
  FOR UPDATE USING (auth.uid() = user_id);

-- Delete: dono pode deletar; admin/first_mate também podem (suporte/LGPD)
DROP POLICY IF EXISTS "trade_journal_delete_own_or_staff" ON public.trade_journal;
CREATE POLICY "trade_journal_delete_own_or_staff" ON public.trade_journal
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );
