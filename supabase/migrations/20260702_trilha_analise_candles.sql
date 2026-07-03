-- ============================================================
-- Trilha Gain — "Análise de Candles"
-- EXEMPLO didático: trilha gratuita com 1 unidade e 3 lições.
-- Idempotente: apaga e recria a trilha pelo título.
-- Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
BEGIN
  DELETE FROM public.trilha_tracks WHERE title = 'Análise de Candles';

  -- Trilha (gratuita: is_locked = false)
  INSERT INTO public.trilha_tracks (title, description, icon, color, is_published, is_locked, price_label, lock_note, sort_order)
  VALUES (
    'Análise de Candles',
    'Aprenda a ler o que cada vela do gráfico está te dizendo.',
    'milestone', 'green', true,
    false, NULL, NULL,
    1
  )
  RETURNING id INTO v_track;

  -- ============ UNIDADE 1 ============
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Lendo as Velas', 'Unidade 1', 0)
  RETURNING id INTO v_unit;

  -- ---- Lição 1.1 — Anatomia do candle ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Anatomia de um candle', 15, 0)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'As 4 informações de um candle',
     'body', 'Cada vela mostra 4 preços de um período: abertura, fechamento, máxima e mínima. O retângulo (corpo) vai da abertura ao fechamento. As linhas finas (pavios/sombras) marcam a máxima e a mínima atingidas.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'O corpo do candle representa a distância entre quais preços?',
     'options', jsonb_build_array('Máxima e mínima', 'Abertura e fechamento', 'Ontem e hoje', 'Compra e venda'),
     'correctIndex', 1,
     'explanation', 'O corpo vai da abertura ao fechamento. Máxima e mínima são marcadas pelos pavios.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'Os pavios (sombras) mostram os preços máximo e mínimo do período.',
     'answer', true,
     'explanation', 'Exato: o pavio de cima é a máxima, o de baixo é a mínima.'
   ), 2);

  -- ---- Lição 1.2 — Candle de alta x de baixa ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Alta ou baixa?', 15, 1)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'A cor conta a história',
     'body', 'Quando o fechamento fica ACIMA da abertura, o candle é de alta (geralmente verde): os compradores dominaram. Quando o fechamento fica ABAIXO da abertura, é de baixa (geralmente vermelho): os vendedores dominaram.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Um candle verde (de alta) significa que:',
     'options', jsonb_build_array('O fechamento ficou abaixo da abertura', 'O fechamento ficou acima da abertura', 'Não houve negócios', 'O preço não se moveu'),
     'correctIndex', 1,
     'explanation', 'Candle de alta = fechou acima de onde abriu. Pressão compradora no período.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'Em um candle de baixa, o fechamento fica acima da abertura.',
     'answer', false,
     'explanation', 'É o contrário: no candle de baixa o fechamento fica ABAIXO da abertura.'
   ), 2);

  -- ---- Lição 1.3 — Doji ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O candle Doji', 20, 2)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'Doji: a indecisão do mercado',
     'body', 'O Doji é um candle de corpo minúsculo: a abertura e o fechamento ficam quase no mesmo preço. Ele sinaliza equilíbrio entre compradores e vendedores — uma possível pausa ou reversão da tendência.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'O que caracteriza um Doji?',
     'options', jsonb_build_array('Corpo muito grande', 'Abertura e fechamento quase no mesmo preço', 'Não tem pavios', 'É sempre verde'),
     'correctIndex', 1,
     'explanation', 'No Doji a abertura ≈ fechamento, formando um corpo minúsculo. Indica indecisão.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'Um Doji pode indicar uma possível reversão da tendência.',
     'answer', true,
     'explanation', 'Sim: o equilíbrio mostrado pelo Doji costuma anteceder pausas ou reversões.'
   ), 2);

END $$;
