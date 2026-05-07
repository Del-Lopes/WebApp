-- Migration: AI Chat Assistant (suporte da plataforma via Gemini)
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Tabela de mensagens do chat
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx
  ON public.chat_messages (user_id, created_at DESC);

-- ============================================================
-- 2. Tabela de uso diário (rate limit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_usage (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date      date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  message_count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

-- ============================================================
-- 3. RLS — usuário lê/insere apenas suas próprias mensagens
-- ============================================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages;
CREATE POLICY "chat_messages_select_own" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_usage_select_own" ON public.chat_usage;
CREATE POLICY "chat_usage_select_own" ON public.chat_usage
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT/UPDATE em chat_usage feito apenas via Edge Function (service role).
-- Sem policies para INSERT/UPDATE = bloqueado para anon/authenticated.
