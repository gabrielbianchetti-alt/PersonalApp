-- =============================================================================
-- Tipo de pacote: Fixo (com dias/horários definidos) vs Alternado (sob demanda)
-- O default é 'alternado' para preservar comportamento dos pacotes já criados.
-- =============================================================================

ALTER TABLE pacotes
  ADD COLUMN IF NOT EXISTS tipo_pacote TEXT NOT NULL
  DEFAULT 'alternado'
  CHECK (tipo_pacote IN ('fixo', 'alternado'));

CREATE INDEX IF NOT EXISTS idx_pacotes_tipo
  ON pacotes (professor_id, tipo_pacote, status);
