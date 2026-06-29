-- ============================================================
-- Trilha Gain — "Conhecendo os Candles" expandida para 10 aulas.
-- Cada aula: 1 conceito (leitura) + 1 exercício (vai p/ o candle
-- amarelo no app). Recria a unidade preservando posição/imagem/tema.
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
  v_order  integer;
  v_img    text;
  v_theme  text;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Trilha não encontrada.'; END IF;

  -- preserva posição/imagem/tema da unidade existente, se houver
  SELECT order_index, image_url, icon_theme INTO v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Conhecendo os Candles';

  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Conhecendo os Candles';

  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Conhecendo os Candles', 'Comece por aqui',
          COALESCE(v_order, 0), v_img, COALESCE(v_theme, 'candle'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é um candle', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que é um candle','body','Um candle (vela) é a forma mais comum de mostrar o preço num gráfico. Cada vela resume o que aconteceu com o preço num período: onde abriu, onde fechou e até onde foi para cima e para baixo.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Cada candle representa o movimento do preço durante um período.','answer',true,'explanation','Isso mesmo: uma vela resume abertura, fechamento, máxima e mínima de um período.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Abertura e fechamento', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Abertura e fechamento','body','O corpo do candle (o retângulo) é formado por dois preços: a ABERTURA (onde o período começou) e o FECHAMENTO (onde terminou). A distância entre eles é o tamanho do corpo.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O corpo do candle é formado por quais dois preços?','options',jsonb_build_array('Máxima e mínima','Abertura e fechamento','Compra e venda','Ontem e hoje'),'correctIndex',1,'explanation','O corpo vai da abertura ao fechamento.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Candle de alta', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Candle de alta','body','Quando o preço FECHA ACIMA de onde abriu, temos um candle de alta — geralmente verde. Significa que os compradores dominaram o período e o preço subiu.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Num candle de alta, o fechamento fica acima da abertura.','answer',true,'explanation','Exato: fechou acima de onde abriu = alta = pressão compradora.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Candle de baixa', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Candle de baixa','body','Quando o preço FECHA ABAIXO de onde abriu, temos um candle de baixa — geralmente vermelho. Significa que os vendedores dominaram o período e o preço caiu.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um candle de baixa (vermelho) indica que:','options',jsonb_build_array('Fechou acima da abertura','Fechou abaixo da abertura','Não houve negócios','O mercado estava fechado'),'correctIndex',1,'explanation','Baixa = fechou abaixo de onde abriu.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Pavios (sombras)', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Pavios (sombras)','body','As linhas finas acima e abaixo do corpo são os PAVIOS (ou sombras). Eles mostram a MÁXIMA e a MÍNIMA que o preço atingiu — até onde o preço foi e voltou no período.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Os pavios mostram a máxima e a mínima atingidas pelo preço.','answer',true,'explanation','Sim: pavio de cima = máxima, pavio de baixo = mínima.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Corpo grande x pequeno', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O tamanho do corpo importa','body','Um corpo grande mostra que houve forte domínio de um lado (muita compra ou muita venda). Um corpo pequeno mostra equilíbrio ou indecisão entre compradores e vendedores no período.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um candle de corpo GRANDE indica:','options',jsonb_build_array('Indecisão','Forte domínio de um lado','Mercado fechado','Erro no gráfico'),'correctIndex',1,'explanation','Corpo grande = movimento forte e decidido.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O Doji', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Doji: a indecisão','body','O Doji é um candle de corpo minúsculo: a abertura e o fechamento ficam quase no mesmo preço. Ele sinaliza equilíbrio entre compradores e vendedores — uma possível pausa ou reversão.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um Doji tem corpo minúsculo e indica indecisão.','answer',true,'explanation','Sim: abertura ≈ fechamento = equilíbrio.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Martelo', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O candle Martelo','body','O Martelo tem corpo pequeno no topo e um pavio inferior longo. Aparece após quedas e sugere que os compradores reagiram, podendo indicar uma reversão de alta.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O Martelo costuma aparecer após:','options',jsonb_build_array('Uma alta forte','Uma queda','O fechamento do mercado','Um feriado'),'correctIndex',1,'explanation','Surge após quedas e sugere reação compradora.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Estrela cadente', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A Estrela Cadente','body','A Estrela Cadente é o oposto do Martelo: corpo pequeno embaixo e pavio superior longo. Aparece após altas e sugere que os vendedores reagiram, podendo indicar reversão de baixa.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A Estrela Cadente aparece após altas e sugere reversão de baixa.','answer',true,'explanation','Sim: pavio superior longo = vendedores rejeitaram preços altos.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Engolfo', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Padrão de Engolfo','body','No Engolfo, um candle "engole" totalmente o corpo do candle anterior. Engolfo de alta (verde engolindo vermelho) sugere reversão para cima; de baixa (vermelho engolindo verde), reversão para baixo.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um Engolfo de ALTA sugere:','options',jsonb_build_array('Continuação da queda','Possível reversão para cima','Indecisão','Nada'),'correctIndex',1,'explanation','Verde engolindo vermelho = força compradora, reversão de alta.'), 1);

END $$;
