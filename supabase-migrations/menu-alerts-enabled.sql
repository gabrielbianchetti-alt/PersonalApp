-- Per-professor toggle to hide the numeric alert badges + subtitles in the
-- sidebar (Progressive Disclosure: alguns usuários preferem o menu limpo).
-- Default true mantém o comportamento atual.

ALTER TABLE public.professor_perfil
  ADD COLUMN IF NOT EXISTS menu_alerts_enabled boolean NOT NULL DEFAULT true;
