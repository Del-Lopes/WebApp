-- ============================================================
-- Trilha Gain — desbloquear unidade paga gastando XP.
-- MVP "Gain Coins": o XP acumulado (trilha_stats.total_xp) passa a ter
-- utilidade — o usuário pode resgatar uma unidade Premium (is_locked)
-- pagando um custo em XP (unlock_cost). Saldo único (debita do total_xp).
--
-- Segurança: o débito acontece SÓ na RPC redeem_unit_unlock (SECURITY
-- DEFINER, transacional). Não há débito no client — a política de update
-- de trilha_stats deixaria o usuário manipular o saldo. A tabela de
-- unlocks não tem policy de INSERT direto; só a RPC grava nela.
--
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

-- 1. Custo em XP para destravar a unidade (NULL/0 = não resgatável por XP).
ALTER TABLE public.trilha_units ADD COLUMN IF NOT EXISTS unlock_cost integer;

-- 2. Desbloqueios por usuário (UNIQUE evita resgatar a mesma unidade 2x).
CREATE TABLE IF NOT EXISTS public.trilha_unit_unlocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id     uuid NOT NULL REFERENCES public.trilha_units(id) ON DELETE CASCADE,
  xp_spent    integer NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit_id)
);
CREATE INDEX IF NOT EXISTS trilha_unit_unlocks_user_idx ON public.trilha_unit_unlocks (user_id);

ALTER TABLE public.trilha_unit_unlocks ENABLE ROW LEVEL SECURITY;

-- SELECT: dono ou staff (mesmo molde de trilha_stats). Sem policy de INSERT
-- direto → a inserção só acontece dentro da RPC (SECURITY DEFINER ignora RLS).
DROP POLICY IF EXISTS "trilha_unit_unlocks_select_own_or_staff" ON public.trilha_unit_unlocks;
CREATE POLICY "trilha_unit_unlocks_select_own_or_staff" ON public.trilha_unit_unlocks FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'first_mate'))
);

-- 3. RPC transacional: valida saldo, debita total_xp, registra o unlock.
--    Idempotente: se já desbloqueada, retorna o XP atual sem cobrar de novo.
CREATE OR REPLACE FUNCTION public.redeem_unit_unlock(p_unit_id uuid)
RETURNS integer            -- novo total_xp
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_cost   integer;
  v_locked boolean;
  v_xp     integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- já desbloqueada? retorna o XP atual sem cobrar (idempotente)
  IF EXISTS (SELECT 1 FROM trilha_unit_unlocks WHERE user_id = v_uid AND unit_id = p_unit_id) THEN
    RETURN (SELECT total_xp FROM trilha_stats WHERE user_id = v_uid);
  END IF;

  SELECT is_locked, unlock_cost INTO v_locked, v_cost
  FROM trilha_units WHERE id = p_unit_id;

  IF v_cost IS NULL OR v_cost <= 0 OR v_locked IS NOT TRUE THEN
    RAISE EXCEPTION 'not_redeemable';
  END IF;

  SELECT total_xp INTO v_xp FROM trilha_stats WHERE user_id = v_uid FOR UPDATE;
  IF v_xp IS NULL OR v_xp < v_cost THEN
    RAISE EXCEPTION 'insufficient_xp';
  END IF;

  UPDATE trilha_stats SET total_xp = total_xp - v_cost WHERE user_id = v_uid;
  INSERT INTO trilha_unit_unlocks (user_id, unit_id, xp_spent) VALUES (v_uid, p_unit_id, v_cost);

  RETURN v_xp - v_cost;
END $$;

REVOKE ALL ON FUNCTION public.redeem_unit_unlock(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_unit_unlock(uuid) TO authenticated;

-- 4. Seed: a unidade Premium "Método APP" custa 5.000 XP para destravar.
UPDATE public.trilha_units SET unlock_cost = 5000 WHERE title = 'Método APP';
