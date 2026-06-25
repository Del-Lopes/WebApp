-- Trilha Gain — bloqueio por unidade (unidade paga).
-- is_locked=true → unidade aparece com cadeado; lições não abrem.
-- lock_note → mensagem exibida ao tocar na unidade bloqueada.
ALTER TABLE public.trilha_units
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.trilha_units
  ADD COLUMN IF NOT EXISTS lock_note text;
