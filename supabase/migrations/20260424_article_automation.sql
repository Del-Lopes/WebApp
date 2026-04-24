-- Migration: Article Generation System (semi-manual, URL-based)
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Logs table (única tabela necessária)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.article_automation_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  topic           text NOT NULL,        -- stores the source_url used
  model_used      text NOT NULL,
  status          text NOT NULL CHECK (status IN ('success', 'error')),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. RLS — admins lêem, service role escreve
-- ============================================================
ALTER TABLE public.article_automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_logs" ON public.article_automation_logs;
CREATE POLICY "admin_read_logs" ON public.article_automation_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. Coluna ai_generated na tabela articles (opcional, seguro)
-- ============================================================
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false;

-- ============================================================
-- NOTA: A tabela article_automation_settings foi removida do design.
-- Persona e categoria são enviadas diretamente no body de cada request
-- pela UI do AdminPanel — sem necessidade de persistência no banco.
--
-- Se você rodou a migration anterior e criou article_automation_settings,
-- pode removê-la com segurança (ela é isolada e não tem dependências):
--   DROP TABLE IF EXISTS public.article_automation_settings;
-- ============================================================
