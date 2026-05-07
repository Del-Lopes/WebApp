-- Migration: Painel Admin de Conversas IA
-- Adiciona acesso de leitura para 'first_mate' e tabela de resumos de tópicos.
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Atualiza RLS de chat_messages para incluir first_mate
-- ============================================================
DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages;
CREATE POLICY "chat_messages_select_own" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- DELETE: usuário pode apagar as próprias mensagens (botão "limpar conversa")
-- e admin/first_mate podem apagar de qualquer usuário (moderação)
DROP POLICY IF EXISTS "chat_messages_delete_own_or_admin" ON public.chat_messages;
CREATE POLICY "chat_messages_delete_own_or_admin" ON public.chat_messages
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- ============================================================
-- 2. Atualiza RLS de chat_usage para incluir first_mate
-- ============================================================
DROP POLICY IF EXISTS "chat_usage_select_own" ON public.chat_usage;
CREATE POLICY "chat_usage_select_own" ON public.chat_usage
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- ============================================================
-- 3. Tabela de resumos de tópicos (categorização IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_topic_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic           text NOT NULL,
  description     text,
  message_count   integer NOT NULL DEFAULT 0,
  user_count      integer NOT NULL DEFAULT 0,
  sample_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  period_days     integer NOT NULL DEFAULT 7,
  generated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_topic_summaries_generated_idx
  ON public.chat_topic_summaries (generated_at DESC);

ALTER TABLE public.chat_topic_summaries ENABLE ROW LEVEL SECURITY;

-- Admin/first_mate leem; escrita só pela Edge Function (service role)
DROP POLICY IF EXISTS "chat_topics_admin_read" ON public.chat_topic_summaries;
CREATE POLICY "chat_topics_admin_read" ON public.chat_topic_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );
