-- ============================================================
-- Trilha Gain — "Problemas diários" (treino prático com candles).
-- O usuário resolve até 3 situações de mercado por dia (dia civil em
-- America/Sao_Paulo). Para fazer mais, paga Coins por um pacote extra.
--
-- Segurança: a cota e o débito vivem SÓ em RPCs SECURITY DEFINER.
-- As tabelas não têm policy de INSERT/UPDATE — o cliente não consegue
-- forjar tentativas nem zerar o contador.
--
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

-- 1. Tentativas resolvidas (uma linha por problema respondido).
CREATE TABLE IF NOT EXISTS public.trilha_daily_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day         date NOT NULL,
  kind        text NOT NULL,
  seed        bigint NOT NULL,
  correct     boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trilha_daily_attempts_user_day_idx
  ON public.trilha_daily_attempts (user_id, day);

-- 2. Pacotes extras comprados por dia.
CREATE TABLE IF NOT EXISTS public.trilha_daily_extra (
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day      date NOT NULL,
  packs    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.trilha_daily_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_daily_extra    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trilha_daily_attempts_select_own_or_staff" ON public.trilha_daily_attempts;
CREATE POLICY "trilha_daily_attempts_select_own_or_staff" ON public.trilha_daily_attempts FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'first_mate'))
);
DROP POLICY IF EXISTS "trilha_daily_extra_select_own_or_staff" ON public.trilha_daily_extra;
CREATE POLICY "trilha_daily_extra_select_own_or_staff" ON public.trilha_daily_extra FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'first_mate'))
);

-- 3. Configuração (editável pelo admin em trilha_config).
INSERT INTO public.trilha_config (key, value) VALUES
  ('daily_free',      3),    -- situações grátis por dia
  ('daily_pack_size', 3),    -- situações por pacote extra
  ('daily_pack_cost', 200)   -- Coins por pacote extra
ON CONFLICT (key) DO NOTHING;

-- 4. Status do dia (leitura): usado, permitido, custo do pacote e acertos.
CREATE OR REPLACE FUNCTION public.daily_problems_status_internal(p_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day     date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_free    integer;
  v_size    integer;
  v_cost    integer;
  v_packs   integer;
  v_used    integer;
  v_ok_day  integer;
  v_total   integer;
  v_ok_all  integer;
  v_admin   boolean;
BEGIN
  SELECT value INTO v_free FROM trilha_config WHERE key = 'daily_free';
  SELECT value INTO v_size FROM trilha_config WHERE key = 'daily_pack_size';
  SELECT value INTO v_cost FROM trilha_config WHERE key = 'daily_pack_cost';
  v_free := COALESCE(v_free, 3);
  v_size := COALESCE(v_size, 3);
  v_cost := COALESCE(v_cost, 200);

  SELECT COALESCE(packs, 0) INTO v_packs FROM trilha_daily_extra WHERE user_id = p_uid AND day = v_day;
  v_packs := COALESCE(v_packs, 0);

  SELECT count(*), count(*) FILTER (WHERE correct) INTO v_used, v_ok_day
  FROM trilha_daily_attempts WHERE user_id = p_uid AND day = v_day;

  SELECT count(*), count(*) FILTER (WHERE correct) INTO v_total, v_ok_all
  FROM trilha_daily_attempts WHERE user_id = p_uid;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_uid AND role = 'admin') INTO v_admin;

  RETURN jsonb_build_object(
    'used', v_used,
    'allowed', v_free + v_packs * v_size,
    'free', v_free,
    'pack_size', v_size,
    'pack_cost', v_cost,
    'correct_today', v_ok_day,
    'total', v_total,
    'total_correct', v_ok_all,
    'unlimited', v_admin
  );
END $$;
REVOKE ALL ON FUNCTION public.daily_problems_status_internal(uuid) FROM public;

CREATE OR REPLACE FUNCTION public.get_daily_problems_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  RETURN daily_problems_status_internal(auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.get_daily_problems_status() FROM public;
GRANT EXECUTE ON FUNCTION public.get_daily_problems_status() TO authenticated;

-- 5. Registrar uma resposta. Falha com 'quota_exceeded' se a cota acabou.
CREATE OR REPLACE FUNCTION public.submit_daily_problem(p_kind text, p_seed bigint, p_correct boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_day    date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_status jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_kind IS NULL OR length(p_kind) > 40 THEN RAISE EXCEPTION 'invalid_kind'; END IF;

  -- serializa por usuário para dois cliques simultâneos não furarem a cota
  PERFORM pg_advisory_xact_lock(hashtextextended('daily_problem:' || v_uid::text, 0));

  v_status := daily_problems_status_internal(v_uid);
  IF NOT (v_status->>'unlimited')::boolean
     AND (v_status->>'used')::int >= (v_status->>'allowed')::int THEN
    RAISE EXCEPTION 'quota_exceeded';
  END IF;

  INSERT INTO trilha_daily_attempts (user_id, day, kind, seed, correct)
  VALUES (v_uid, v_day, p_kind, p_seed, COALESCE(p_correct, false));

  RETURN daily_problems_status_internal(v_uid);
END $$;
REVOKE ALL ON FUNCTION public.submit_daily_problem(text, bigint, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_daily_problem(text, bigint, boolean) TO authenticated;

-- 6. Comprar pacote extra de situações (debita Coins de trilha_stats.total_xp).
CREATE OR REPLACE FUNCTION public.buy_daily_problem_pack()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_day  date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_cost integer;
  v_xp   integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT value INTO v_cost FROM trilha_config WHERE key = 'daily_pack_cost';
  v_cost := COALESCE(v_cost, 200);

  SELECT total_xp INTO v_xp FROM trilha_stats WHERE user_id = v_uid FOR UPDATE;
  IF v_xp IS NULL OR v_xp < v_cost THEN RAISE EXCEPTION 'insufficient_xp'; END IF;

  UPDATE trilha_stats SET total_xp = total_xp - v_cost WHERE user_id = v_uid;
  INSERT INTO trilha_daily_extra (user_id, day, packs) VALUES (v_uid, v_day, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET packs = trilha_daily_extra.packs + 1;

  RETURN daily_problems_status_internal(v_uid);
END $$;
REVOKE ALL ON FUNCTION public.buy_daily_problem_pack() FROM public;
GRANT EXECUTE ON FUNCTION public.buy_daily_problem_pack() TO authenticated;
