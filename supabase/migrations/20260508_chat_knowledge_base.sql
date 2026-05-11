-- Migration: Base de Conhecimento para o assistente IA
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Tabela de entradas da base de conhecimento
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_knowledge_base (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content       text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  category      text NOT NULL CHECK (category IN (
                  'Licenças',
                  'Robôs',
                  'Pagamentos',
                  'Educação',
                  'Jornada',
                  'Marketing',
                  'Outros'
                )),
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_knowledge_active_idx
  ON public.chat_knowledge_base (is_active, category);

-- ============================================================
-- 2. Trigger para manter updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_knowledge_set_updated_at ON public.chat_knowledge_base;
CREATE TRIGGER chat_knowledge_set_updated_at
  BEFORE UPDATE ON public.chat_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. RLS — admin/first_mate leem; APENAS admin escreve
-- ============================================================
ALTER TABLE public.chat_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_read_staff" ON public.chat_knowledge_base;
CREATE POLICY "knowledge_read_staff" ON public.chat_knowledge_base
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'first_mate')
    )
  );

DROP POLICY IF EXISTS "knowledge_insert_admin" ON public.chat_knowledge_base;
CREATE POLICY "knowledge_insert_admin" ON public.chat_knowledge_base
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "knowledge_update_admin" ON public.chat_knowledge_base;
CREATE POLICY "knowledge_update_admin" ON public.chat_knowledge_base
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "knowledge_delete_admin" ON public.chat_knowledge_base;
CREATE POLICY "knowledge_delete_admin" ON public.chat_knowledge_base
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- A Edge Function chat-assistant lê via service role (ignora RLS),
-- então não precisamos de policy para "authenticated" lerem entradas
-- ativas — usuários comuns nunca acessam essa tabela diretamente.
