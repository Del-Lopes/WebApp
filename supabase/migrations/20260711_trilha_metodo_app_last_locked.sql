-- ============================================================
-- Trilha Gain — Método APP sempre por último e BLOQUEADA (paga).
-- Rodar DEPOIS de 20260710_trilha_unit_locked.sql.
-- Idempotente.
-- ============================================================

DO $$
DECLARE v_track uuid;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN RETURN; END IF;

  -- Move "Método APP" para o final da trilha (maior order_index + 1).
  UPDATE public.trilha_units
  SET order_index = (
    SELECT COALESCE(MAX(order_index), 0) + 1
    FROM public.trilha_units
    WHERE track_id = v_track AND title <> 'Método APP'
  )
  WHERE track_id = v_track AND title = 'Método APP';

  -- Bloqueia a unidade (conteúdo pago) com mensagem informativa.
  UPDATE public.trilha_units
  SET is_locked = true,
      lock_note = 'Conteúdo exclusivo da Jornada Premium. Em breve você poderá desbloquear.'
  WHERE track_id = v_track AND title = 'Método APP';
END $$;
