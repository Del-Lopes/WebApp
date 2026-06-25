-- Trilha Gain — tema de ícone por unidade.
-- icon_theme controla o ícone dos nós das aulas:
--   'candle' → velas | 'coin' → fichas de ouro | 'crypto' → criptomoeda | 'default'
ALTER TABLE public.trilha_units
  ADD COLUMN IF NOT EXISTS icon_theme text NOT NULL DEFAULT 'default';

-- Define os temas das unidades da "Jornada do Trader"
DO $$
DECLARE v_track uuid;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN RETURN; END IF;

  UPDATE public.trilha_units SET icon_theme = 'candle'
    WHERE track_id = v_track AND title IN ('Conhecendo os Candles', 'Lendo as Velas');
  UPDATE public.trilha_units SET icon_theme = 'coin'
    WHERE track_id = v_track AND title IN ('Primeiros Passos', 'Gerenciamento de Risco', 'Método APP');
END $$;
