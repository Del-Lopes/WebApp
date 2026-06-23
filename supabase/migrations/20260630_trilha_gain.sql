-- ============================================================
-- Trilha Gain — aprendizado gamificado estilo Duolingo
-- Hierarquia: tracks → units → lessons → steps
-- Progresso e gamificação por usuário (progress + stats)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabelas de conteúdo (admin gerencia, todos leem)
-- ------------------------------------------------------------

-- Trilhas (a "espinha dorsal")
CREATE TABLE IF NOT EXISTS public.trilha_tracks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  image_url    text,
  icon         text,
  color        text DEFAULT 'green',
  is_published boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Unidades (as "ilhas" que agrupam lições)
CREATE TABLE IF NOT EXISTS public.trilha_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    uuid NOT NULL REFERENCES public.trilha_tracks(id) ON DELETE CASCADE,
  title       text NOT NULL,
  subtitle    text,
  color       text DEFAULT 'green',
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trilha_units_track_idx ON public.trilha_units (track_id, order_index);

-- Lições (os nós da trilha)
CREATE TABLE IF NOT EXISTS public.trilha_lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     uuid NOT NULL REFERENCES public.trilha_units(id) ON DELETE CASCADE,
  title       text NOT NULL,
  icon        text,
  xp_reward   integer NOT NULL DEFAULT 10,
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trilha_lessons_unit_idx ON public.trilha_lessons (unit_id, order_index);

-- Passos (exercícios dentro da lição) — payload JSONB por tipo
CREATE TABLE IF NOT EXISTS public.trilha_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid NOT NULL REFERENCES public.trilha_lessons(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('concept','quiz','truefalse','order','chart')),
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trilha_steps_lesson_idx ON public.trilha_steps (lesson_id, order_index);

-- ------------------------------------------------------------
-- 2. Tabelas de usuário (progresso + gamificação)
-- ------------------------------------------------------------

-- Uma linha por lição concluída
CREATE TABLE IF NOT EXISTS public.trilha_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES public.trilha_lessons(id) ON DELETE CASCADE,
  score        integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS trilha_progress_user_idx ON public.trilha_progress (user_id);

-- Gamificação agregada (uma linha por usuário)
CREATE TABLE IF NOT EXISTS public.trilha_stats (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp           integer NOT NULL DEFAULT 0,
  current_streak     integer NOT NULL DEFAULT 0,
  best_streak        integer NOT NULL DEFAULT 0,
  last_activity_date date,
  badges             jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. Triggers updated_at (reaproveita public.set_updated_at)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trilha_tracks_set_updated_at ON public.trilha_tracks;
CREATE TRIGGER trilha_tracks_set_updated_at
  BEFORE UPDATE ON public.trilha_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trilha_stats_set_updated_at ON public.trilha_stats;
CREATE TRIGGER trilha_stats_set_updated_at
  BEFORE UPDATE ON public.trilha_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------

-- Conteúdo: leitura pública (apenas publicados via app); escrita só admin.
ALTER TABLE public.trilha_tracks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_units   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_steps   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trilha_tracks_public_read" ON public.trilha_tracks;
CREATE POLICY "trilha_tracks_public_read" ON public.trilha_tracks FOR SELECT USING (true);
DROP POLICY IF EXISTS "trilha_tracks_admin_write" ON public.trilha_tracks;
CREATE POLICY "trilha_tracks_admin_write" ON public.trilha_tracks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "trilha_units_public_read" ON public.trilha_units;
CREATE POLICY "trilha_units_public_read" ON public.trilha_units FOR SELECT USING (true);
DROP POLICY IF EXISTS "trilha_units_admin_write" ON public.trilha_units;
CREATE POLICY "trilha_units_admin_write" ON public.trilha_units FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "trilha_lessons_public_read" ON public.trilha_lessons;
CREATE POLICY "trilha_lessons_public_read" ON public.trilha_lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "trilha_lessons_admin_write" ON public.trilha_lessons;
CREATE POLICY "trilha_lessons_admin_write" ON public.trilha_lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "trilha_steps_public_read" ON public.trilha_steps;
CREATE POLICY "trilha_steps_public_read" ON public.trilha_steps FOR SELECT USING (true);
DROP POLICY IF EXISTS "trilha_steps_admin_write" ON public.trilha_steps;
CREATE POLICY "trilha_steps_admin_write" ON public.trilha_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Progresso: dono gerencia o próprio; admin/first_mate leem tudo.
ALTER TABLE public.trilha_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trilha_progress_select_own_or_staff" ON public.trilha_progress;
CREATE POLICY "trilha_progress_select_own_or_staff" ON public.trilha_progress FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'first_mate'))
);
DROP POLICY IF EXISTS "trilha_progress_insert_own" ON public.trilha_progress;
CREATE POLICY "trilha_progress_insert_own" ON public.trilha_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "trilha_progress_update_own" ON public.trilha_progress;
CREATE POLICY "trilha_progress_update_own" ON public.trilha_progress FOR UPDATE USING (auth.uid() = user_id);

-- Stats: dono gerencia o próprio; admin/first_mate leem tudo.
ALTER TABLE public.trilha_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trilha_stats_select_own_or_staff" ON public.trilha_stats;
CREATE POLICY "trilha_stats_select_own_or_staff" ON public.trilha_stats FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'first_mate'))
);
DROP POLICY IF EXISTS "trilha_stats_insert_own" ON public.trilha_stats;
CREATE POLICY "trilha_stats_insert_own" ON public.trilha_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "trilha_stats_update_own" ON public.trilha_stats;
CREATE POLICY "trilha_stats_update_own" ON public.trilha_stats FOR UPDATE USING (auth.uid() = user_id);
