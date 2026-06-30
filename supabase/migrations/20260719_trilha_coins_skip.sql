-- ============================================================
-- Trilha Gain — "pular unidade" gastando Coins (antes "XP").
-- O usuário pode pagar 1000 Coins para liberar o ACESSO a uma unidade
-- à frente que ainda está travada pela progressão. O pulo NÃO move a
-- frente da progressão (ele volta de onde estava); a unidade pulada
-- conta como concluída ao terminá-la, mas não destrava a seguinte —
-- a próxima só abre quando a cadeia U1→…→Un estiver toda concluída
-- organicamente, ou ele pague outro pulo.
--
-- Premium (Método APP): organicamente = unlock_cost (5000). Pular pra
-- lá sem ter chegado = 5000 (premium) + 1000 (pulo) = 6000, em dois
-- registros distintos (reason 'premium' e 'skip').
--
-- "Coins" é só o rótulo visível; o saldo continua em trilha_stats.total_xp.
--
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

-- 1. Distingue o motivo do unlock: 'premium' (desbloqueio da unidade paga)
--    ou 'skip' (pulo de progressão). Linhas antigas viram 'premium'.
ALTER TABLE public.trilha_unit_unlocks
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT 'premium';

-- 2. Custo do pulo de progressão (valor global do sistema).
CREATE TABLE IF NOT EXISTS public.trilha_config (
  key   text PRIMARY KEY,
  value integer NOT NULL
);
INSERT INTO public.trilha_config (key, value) VALUES ('skip_cost', 1000)
  ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.trilha_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trilha_config_public_read" ON public.trilha_config;
CREATE POLICY "trilha_config_public_read" ON public.trilha_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "trilha_config_admin_write" ON public.trilha_config;
CREATE POLICY "trilha_config_admin_write" ON public.trilha_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. RPC: pular uma unidade (libera acesso) por skip_cost Coins.
--    Se a unidade também é Premium (is_locked + unlock_cost) e ainda não
--    foi desbloqueada por 'premium', cobra premium + skip num débito só
--    e grava os dois registros. Idempotente: já-acessível não cobra de novo.
CREATE OR REPLACE FUNCTION public.redeem_unit_skip(p_unit_id uuid)
RETURNS integer            -- novo total_xp
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_skip_cost integer;
  v_is_locked boolean;
  v_unlock    integer;
  v_premium   integer := 0;   -- parte premium a cobrar junto, se aplicável
  v_total     integer;
  v_xp        integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- já tem acesso (qualquer reason)? então nada a cobrar (idempotente)
  IF EXISTS (SELECT 1 FROM trilha_unit_unlocks WHERE user_id = v_uid AND unit_id = p_unit_id) THEN
    RETURN (SELECT total_xp FROM trilha_stats WHERE user_id = v_uid);
  END IF;

  SELECT value INTO v_skip_cost FROM trilha_config WHERE key = 'skip_cost';
  IF v_skip_cost IS NULL THEN v_skip_cost := 1000; END IF;

  SELECT is_locked, unlock_cost INTO v_is_locked, v_unlock
  FROM trilha_units WHERE id = p_unit_id;

  -- se a unidade é Premium e ainda não foi paga, o pulo embute o premium
  IF v_is_locked IS TRUE AND v_unlock IS NOT NULL AND v_unlock > 0 THEN
    v_premium := v_unlock;
  END IF;

  v_total := v_skip_cost + v_premium;

  SELECT total_xp INTO v_xp FROM trilha_stats WHERE user_id = v_uid FOR UPDATE;
  IF v_xp IS NULL OR v_xp < v_total THEN
    RAISE EXCEPTION 'insufficient_xp';
  END IF;

  UPDATE trilha_stats SET total_xp = total_xp - v_total WHERE user_id = v_uid;

  -- 1 registro por (user, unit). reason='skip'; xp_spent = total cobrado
  -- (skip + premium embutido, quando a unidade pulada também era Premium).
  INSERT INTO trilha_unit_unlocks (user_id, unit_id, xp_spent, reason)
  VALUES (v_uid, p_unit_id, v_total, 'skip');

  RETURN v_xp - v_total;
END $$;

REVOKE ALL ON FUNCTION public.redeem_unit_skip(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_unit_skip(uuid) TO authenticated;
