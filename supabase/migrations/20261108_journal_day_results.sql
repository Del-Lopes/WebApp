-- Diário › resultado do dia lançado direto no calendário (sem detalhar operações).
-- Soma-se às operações fechadas do mesmo dia. Uma linha por usuário e dia.

CREATE TABLE IF NOT EXISTS public.journal_day_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day         date NOT NULL,
  amount      numeric(18, 2) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

CREATE INDEX IF NOT EXISTS journal_day_results_user_day_idx
  ON public.journal_day_results (user_id, day DESC);

DROP TRIGGER IF EXISTS journal_day_results_set_updated_at ON public.journal_day_results;
CREATE TRIGGER journal_day_results_set_updated_at
  BEFORE UPDATE ON public.journal_day_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.journal_day_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_day_results_select_own" ON public.journal_day_results;
CREATE POLICY "journal_day_results_select_own" ON public.journal_day_results
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_day_results_insert_own" ON public.journal_day_results;
CREATE POLICY "journal_day_results_insert_own" ON public.journal_day_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_day_results_update_own" ON public.journal_day_results;
CREATE POLICY "journal_day_results_update_own" ON public.journal_day_results
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_day_results_delete_own" ON public.journal_day_results;
CREATE POLICY "journal_day_results_delete_own" ON public.journal_day_results
  FOR DELETE USING (auth.uid() = user_id);
