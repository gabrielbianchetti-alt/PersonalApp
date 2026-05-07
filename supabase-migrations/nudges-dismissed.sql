-- Tracks which contextual nudges (dicas inteligentes) each professor has
-- dismissed. Used by Progressive Disclosure: each nudge appears at most once
-- per professor; reactivation in /dashboard/configuracoes deletes all rows for
-- that professor.

CREATE TABLE IF NOT EXISTS public.nudges_dismissed (
  id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id  uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nudge_key     text           NOT NULL,
  dismissed_at  timestamptz    NOT NULL DEFAULT now(),
  UNIQUE (professor_id, nudge_key)
);

CREATE INDEX IF NOT EXISTS nudges_dismissed_professor_id_idx
  ON public.nudges_dismissed (professor_id);

ALTER TABLE public.nudges_dismissed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professor manages own dismissals" ON public.nudges_dismissed;
CREATE POLICY "professor manages own dismissals"
  ON public.nudges_dismissed
  FOR ALL
  TO authenticated
  USING  (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

-- Add to realtime publication so dismissals reflect across tabs immediately.
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.nudges_dismissed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Per-professor toggle to disable all nudges. Stored in professor_perfil so
-- it lives next to the existing user preferences (cor_tema, modo_tema).
ALTER TABLE public.professor_perfil
  ADD COLUMN IF NOT EXISTS nudges_enabled boolean NOT NULL DEFAULT true;
