-- Migration: Feedback 👍/👎 nas respostas do assistente IA
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Tabela de feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        text NOT NULL CHECK (rating IN ('up', 'down')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Um usuário só pode avaliar uma mensagem uma vez (atualiza em vez de duplicar)
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_feedback_message_idx
  ON public.chat_feedback (message_id);
CREATE INDEX IF NOT EXISTS chat_feedback_rating_idx
  ON public.chat_feedback (rating, created_at DESC);

-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

-- Usuário lê o próprio; admin/first_mate leem tudo
DROP POLICY IF EXISTS "feedback_select_own_or_staff" ON public.chat_feedback;
CREATE POLICY "feedback_select_own_or_staff" ON public.chat_feedback
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- Usuário só insere/atualiza/deleta o próprio
DROP POLICY IF EXISTS "feedback_insert_own" ON public.chat_feedback;
CREATE POLICY "feedback_insert_own" ON public.chat_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_update_own" ON public.chat_feedback;
CREATE POLICY "feedback_update_own" ON public.chat_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Delete: dono pode deletar; admin/first_mate também (pra "ignorar" feedback ruidoso)
DROP POLICY IF EXISTS "feedback_delete_own_or_staff" ON public.chat_feedback;
CREATE POLICY "feedback_delete_own_or_staff" ON public.chat_feedback
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

-- ============================================================
-- 3. Limpeza opcional: apaga mensagens antigas (testes)
-- ============================================================
-- Você pediu para apagar as mensagens anteriores, já que eram apenas testes.
-- Descomente a linha abaixo no SQL Editor se quiser executar:
-- DELETE FROM public.chat_messages;
