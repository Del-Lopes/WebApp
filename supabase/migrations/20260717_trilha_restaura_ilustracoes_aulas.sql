-- ============================================================
-- Trilha Gain — RESTAURA as ilustrações (SVG) dentro das aulas da
-- unidade "Conhecendo os Candles". A expansão para 10 aulas
-- (20260714) recriou as aulas sem o image_url do concept; aqui
-- reinjetamos os 5 SVGs originais (de 20260705) via jsonb_set no
-- step concept (order_index = 0) de cada aula, casando pelo título.
-- Idempotente. Rodar DEPOIS da 20260714/20260715.
-- ============================================================

DO $$
DECLARE
  v_track uuid;
  v_unit  uuid;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Trilha não encontrada.'; END IF;
  SELECT id INTO v_unit FROM public.trilha_units WHERE track_id = v_track AND title = 'Conhecendo os Candles';
  IF v_unit IS NULL THEN RAISE EXCEPTION 'Unidade Candles não encontrada.'; END IF;

  -- O que é um candle
  UPDATE public.trilha_steps s
  SET payload = jsonb_set(s.payload, '{image_url}', to_jsonb('data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Cg stroke=''%23cbd5e1'' stroke-width=''1'' stroke-dasharray=''4 4''%3E%3Cline x1=''200'' y1=''60'' x2=''340'' y2=''60''/%3E%3Cline x1=''200'' y1=''95'' x2=''340'' y2=''95''/%3E%3Cline x1=''200'' y1=''175'' x2=''340'' y2=''175''/%3E%3Cline x1=''200'' y1=''205'' x2=''340'' y2=''205''/%3E%3C/g%3E%3Crect x=''184'' y=''60'' width=''4'' height=''145'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''158'' y=''95'' width=''56'' height=''80'' rx=''6'' fill=''%2310b981''/%3E%3Ctext x=''220'' y=''65'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EMáxima (pavio)%3C/text%3E%3Ctext x=''220'' y=''100'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EFechamento%3C/text%3E%3Ctext x=''220'' y=''180'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EAbertura%3C/text%3E%3Ctext x=''220'' y=''210'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EMínima (pavio)%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3EAnatomia do candle%3C/text%3E%3C/svg%3E'::text), true)
  FROM public.trilha_lessons l
  WHERE s.lesson_id = l.id
    AND l.unit_id = v_unit
    AND l.title = 'O que é um candle'
    AND s.type = 'concept';

  -- Abertura e fechamento
  UPDATE public.trilha_steps s
  SET payload = jsonb_set(s.payload, '{image_url}', to_jsonb('data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''148'' y=''70'' width=''4'' height=''130'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''122'' y=''90'' width=''56'' height=''90'' rx=''6'' fill=''%2310b981''/%3E%3Cline x1=''120'' y1=''90'' x2=''180'' y2=''90'' stroke=''%2310b981'' stroke-width=''2''/%3E%3Cline x1=''120'' y1=''180'' x2=''180'' y2=''180'' stroke=''%2310b981'' stroke-width=''2''/%3E%3Ctext x=''120'' y=''84'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%2310b981''%3Efecha aqui%3C/text%3E%3Ctext x=''120'' y=''196'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%2310b981''%3Eabre aqui%3C/text%3E%3Ctext x=''250'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EO corpo vai%3C/text%3E%3Ctext x=''250'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eda abertura%3C/text%3E%3Ctext x=''250'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eao fechamento%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3EAbertura e fechamento%3C/text%3E%3C/svg%3E'::text), true)
  FROM public.trilha_lessons l
  WHERE s.lesson_id = l.id
    AND l.unit_id = v_unit
    AND l.title = 'Abertura e fechamento'
    AND s.type = 'concept';

  -- Candle de alta
  UPDATE public.trilha_steps s
  SET payload = jsonb_set(s.payload, '{image_url}', to_jsonb('data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''148'' y=''65'' width=''4'' height=''140'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''122'' y=''90'' width=''56'' height=''90'' rx=''6'' fill=''%2310b981''/%3E%3Cpath d=''M250 170 L300 110 L320 130 L350 80'' stroke=''%2310b981'' stroke-width=''3'' fill=''none'' stroke-linecap=''round'' stroke-linejoin=''round''/%3E%3Cpolygon points=''350,80 342,84 350,72 358,84'' fill=''%2310b981''/%3E%3Ctext x=''200'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''bold'' fill=''%2310b981''%3EFechou ACIMA%3C/text%3E%3Ctext x=''200'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eda abertura%3C/text%3E%3Ctext x=''200'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3E= compradores%3C/text%3E%3Ctext x=''200'' y=''168'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Edominaram%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3ECandle de alta%3C/text%3E%3C/svg%3E'::text), true)
  FROM public.trilha_lessons l
  WHERE s.lesson_id = l.id
    AND l.unit_id = v_unit
    AND l.title = 'Candle de alta'
    AND s.type = 'concept';

  -- Candle de baixa
  UPDATE public.trilha_steps s
  SET payload = jsonb_set(s.payload, '{image_url}', to_jsonb('data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''148'' y=''65'' width=''4'' height=''140'' rx=''2'' fill=''%23ef4444''/%3E%3Crect x=''122'' y=''90'' width=''56'' height=''90'' rx=''6'' fill=''%23ef4444''/%3E%3Cpath d=''M250 90 L300 150 L320 130 L350 185'' stroke=''%23ef4444'' stroke-width=''3'' fill=''none'' stroke-linecap=''round'' stroke-linejoin=''round''/%3E%3Cpolygon points=''350,185 342,181 350,193 358,181'' fill=''%23ef4444''/%3E%3Ctext x=''200'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''bold'' fill=''%23ef4444''%3EFechou ABAIXO%3C/text%3E%3Ctext x=''200'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eda abertura%3C/text%3E%3Ctext x=''200'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3E= vendedores%3C/text%3E%3Ctext x=''200'' y=''168'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Edominaram%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3ECandle de baixa%3C/text%3E%3C/svg%3E'::text), true)
  FROM public.trilha_lessons l
  WHERE s.lesson_id = l.id
    AND l.unit_id = v_unit
    AND l.title = 'Candle de baixa'
    AND s.type = 'concept';

  -- Pavios (sombras)
  UPDATE public.trilha_steps s
  SET payload = jsonb_set(s.payload, '{image_url}', to_jsonb('data:image/svg+xml;utf8,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''400'' height=''240'' viewBox=''0 0 400 240''%3E%3Crect width=''400'' height=''240'' rx=''16'' fill=''%23f8fafc''/%3E%3Crect x=''138'' y=''60'' width=''4'' height=''150'' rx=''2'' fill=''%2310b981''/%3E%3Crect x=''112'' y=''110'' width=''56'' height=''50'' rx=''6'' fill=''%2310b981''/%3E%3Ctext x=''165'' y=''80'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%23475569''%3Epavio superior%3C/text%3E%3Ctext x=''165'' y=''195'' font-family=''Arial,sans-serif'' font-size=''12'' font-weight=''normal'' fill=''%23475569''%3Epavio inferior%3C/text%3E%3Cline x1=''120'' y1=''110'' x2=''160'' y2=''110'' stroke=''%23cbd5e1'' stroke-width=''1''/%3E%3Cline x1=''120'' y1=''160'' x2=''160'' y2=''160'' stroke=''%23cbd5e1'' stroke-width=''1''/%3E%3Ctext x=''250'' y=''110'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3EOs pavios mostram%3C/text%3E%3Ctext x=''250'' y=''130'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Eaté onde o preço%3C/text%3E%3Ctext x=''250'' y=''150'' font-family=''Arial,sans-serif'' font-size=''14'' font-weight=''normal'' fill=''%23475569''%3Efoi e voltou%3C/text%3E%3Ctext x=''24'' y=''38'' font-family=''Arial,sans-serif'' font-size=''16'' font-weight=''bold'' fill=''%230f172a''%3EPavios (sombras)%3C/text%3E%3C/svg%3E'::text), true)
  FROM public.trilha_lessons l
  WHERE s.lesson_id = l.id
    AND l.unit_id = v_unit
    AND l.title = 'Pavios (sombras)'
    AND s.type = 'concept';

END $$;
