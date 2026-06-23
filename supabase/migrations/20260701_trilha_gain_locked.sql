-- ============================================================
-- Trilha Gain — trilhas gratuitas vs pagas
-- Mesmo padrão da Biblioteca (products.is_locked / lock_note):
--   is_locked = false  → trilha gratuita (abre normalmente)
--   is_locked = true   → trilha paga (mostra cadeado + modal informativo)
-- ============================================================

ALTER TABLE public.trilha_tracks
  ADD COLUMN IF NOT EXISTS is_locked   boolean NOT NULL DEFAULT false;

ALTER TABLE public.trilha_tracks
  ADD COLUMN IF NOT EXISTS lock_note   text;

-- price_label: string livre exibida no card/modal ("R$ 297", "Gratis", "Premium")
ALTER TABLE public.trilha_tracks
  ADD COLUMN IF NOT EXISTS price_label text;
