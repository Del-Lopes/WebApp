-- Trilha Gain — ilustração temática por unidade.
-- image_url guarda uma cena (SVG data URI ou URL) exibida no banner da unidade.
ALTER TABLE public.trilha_units
  ADD COLUMN IF NOT EXISTS image_url text;
