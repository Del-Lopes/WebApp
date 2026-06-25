-- ============================================================
-- Trilha Gain — Unidade introdutória "Conhecendo os Candles"
-- Cards curtos com imagens ilustrativas (SVG embutido).
-- Insere a unidade no INÍCIO da trilha "Jornada do Trader" e
-- reordena as demais unidades para depois.
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Trilha "Jornada do Trader" não encontrada. Rode 20260704_trilha_unificada.sql primeiro.';
  END IF;

  -- Remove a unidade introdutória se já existir (idempotência)
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Conhecendo os Candles';

  -- Empurra todas as unidades existentes uma posição para frente
  UPDATE public.trilha_units SET order_index = order_index + 1 WHERE track_id = v_track;

  -- Cria a unidade introdutória na posição 0 (começo da trilha)
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Conhecendo os Candles', 'Comece por aqui', 0)
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é um candle', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que é um candle','body','Um candle (vela) é a forma mais comum de mostrar o preço num gráfico. Cada vela resume o que aconteceu com o preço num período: onde abriu, onde fechou e até onde foi para cima e para baixo.','image_url','data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Cg stroke=''%23cbd5e1'' stroke-width=''1'' stroke-dasharray=''4 4''%3E%3Cline x1=''200'' y1=''60'' x2=''340'' y2=''60''/%3E%3Cline x1=''200'' y1=''95'' x2=''340'' y2=''95''/%3E%3Cline x1=''200'' y1=''175'' x2=''340'' y2=''175''/%3E%3Cline x1=''200'' y1=''205'' x2=''340'' y2=''205''/%3E%3C/g%3E%3Crect x=''184'' y=''60'' width=''4'' height=''145'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''158'' y=''95'' width=''56'' height=''80'' rx=''6'' fill=''%2310b981''/%3E%3Ctext x=''220'' y=''65'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EMáxima (pavio)%3C/text%3E%3Ctext x=''220'' y=''100'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EFechamento%3C/text%3E%3Ctext x=''220'' y=''180'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EAbertura%3C/text%3E%3Ctext x=''220'' y=''210'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EMínima (pavio)%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3EAnatomia do candle%3C/text%3E%3C/svg%3E'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Cada candle representa o movimento do preço durante um período.','answer',true,'explanation','Isso mesmo: uma vela resume abertura, fechamento, máxima e mínima de um período.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Abertura e fechamento', 10, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Abertura e fechamento','body','O corpo do candle (o retângulo) é formado por dois preços: a ABERTURA (onde o período começou) e o FECHAMENTO (onde terminou). A distância entre eles é o tamanho do corpo.','image_url','data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''148'' y=''70'' width=''4'' height=''130'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''122'' y=''90'' width=''56'' height=''90'' rx=''6'' fill=''%2310b981''/%3E%3Cline x1=''120'' y1=''90'' x2=''180'' y2=''90'' stroke=''%2310b981'' stroke-width=''2''/%3E%3Cline x1=''120'' y1=''180'' x2=''180'' y2=''180'' stroke=''%2310b981'' stroke-width=''2''/%3E%3Ctext x=''120'' y=''84'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%2310b981''%3Efecha aqui%3C/text%3E%3Ctext x=''120'' y=''196'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%2310b981''%3Eabre aqui%3C/text%3E%3Ctext x=''250'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EO corpo vai%3C/text%3E%3Ctext x=''250'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eda abertura%3C/text%3E%3Ctext x=''250'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eao fechamento%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3EAbertura e fechamento%3C/text%3E%3C/svg%3E'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O corpo do candle é formado por quais dois preços?','options',jsonb_build_array('Máxima e mínima','Abertura e fechamento','Compra e venda','Ontem e hoje'),'correctIndex',1,'explanation','O corpo vai da abertura ao fechamento. Máxima e mínima são os pavios.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Candle de alta', 10, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Candle de alta','body','Quando o preço FECHA ACIMA de onde abriu, temos um candle de alta — geralmente verde. Significa que os compradores dominaram aquele período e o preço subiu.','image_url','data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''148'' y=''65'' width=''4'' height=''140'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''122'' y=''90'' width=''56'' height=''90'' rx=''6'' fill=''%2310b981''/%3E%3Cpath d=''M250 170 L300 110 L320 130 L350 80'' stroke=''%2310b981'' stroke-width=''3'' fill=''none'' stroke-linecap=''round'' stroke-linejoin=''round''/%3E%3Cpolygon points=''350,80 342,84 350,72 358,84'' fill=''%2310b981''/%3E%3Ctext x=''200'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''bold'' fill=''%2310b981''%3EFechou ACIMA%3C/text%3E%3Ctext x=''200'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eda abertura%3C/text%3E%3Ctext x=''200'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3E= compradores%3C/text%3E%3Ctext x=''200'' y=''168'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Edominaram%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3ECandle de alta%3C/text%3E%3C/svg%3E'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Num candle de alta, o fechamento fica acima da abertura.','answer',true,'explanation','Exato: fechou acima de onde abriu = alta = pressão compradora.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Candle de baixa', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Candle de baixa','body','Quando o preço FECHA ABAIXO de onde abriu, temos um candle de baixa — geralmente vermelho. Significa que os vendedores dominaram aquele período e o preço caiu.','image_url','data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''148'' y=''65'' width=''4'' height=''140'' rx=''2'' fill=''%23ef4444''/%3E%3Crect x=''122'' y=''90'' width=''56'' height=''90'' rx=''6'' fill=''%23ef4444''/%3E%3Cpath d=''M250 90 L300 150 L320 130 L350 185'' stroke=''%23ef4444'' stroke-width=''3'' fill=''none'' stroke-linecap=''round'' stroke-linejoin=''round''/%3E%3Cpolygon points=''350,185 342,181 350,193 358,181'' fill=''%23ef4444''/%3E%3Ctext x=''200'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''bold'' fill=''%23ef4444''%3EFechou ABAIXO%3C/text%3E%3Ctext x=''200'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eda abertura%3C/text%3E%3Ctext x=''200'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3E= vendedores%3C/text%3E%3Ctext x=''200'' y=''168'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Edominaram%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3ECandle de baixa%3C/text%3E%3C/svg%3E'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um candle de baixa (vermelho) indica que:','options',jsonb_build_array('O preço fechou acima da abertura','O preço fechou abaixo da abertura','O preço não se moveu','O mercado estava fechado'),'correctIndex',1,'explanation','Baixa = fechou abaixo de onde abriu = pressão vendedora.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Pavios (sombras)', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Pavios (sombras)','body','As linhas finas acima e abaixo do corpo são os PAVIOS (ou sombras). Eles mostram a MÁXIMA e a MÍNIMA que o preço atingiu no período — ou seja, até onde o preço foi e voltou.','image_url','data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''138'' y=''60'' width=''4'' height=''150'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''112'' y=''110'' width=''56'' height=''50'' rx=''6'' fill=''%2310b981''/%3E%3Ctext x=''165'' y=''80'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%23475569''%3Epavio superior%3C/text%3E%3Ctext x=''165'' y=''195'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%23475569''%3Epavio inferior%3C/text%3E%3Cline x1=''120'' y1=''110'' x2=''160'' y2=''110'' stroke=''%23cbd5e1'' stroke-width=''1''/%3E%3Cline x1=''120'' y1=''160'' x2=''160'' y2=''160'' stroke=''%23cbd5e1'' stroke-width=''1''/%3E%3Ctext x=''250'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EOs pavios mostram%3C/text%3E%3Ctext x=''250'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eaté onde o preço%3C/text%3E%3Ctext x=''250'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Efoi e voltou%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3EPavios (sombras)%3C/text%3E%3C/svg%3E'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Os pavios mostram a máxima e a mínima atingidas pelo preço no período.','answer',true,'explanation','Sim: pavio de cima = máxima, pavio de baixo = mínima.'), 1);

END $$;
