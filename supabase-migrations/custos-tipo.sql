-- =============================================================================
-- Tipo de custo: Profissional (default) vs Pessoal
-- Permite separar gastos do trabalho dos gastos pessoais para que o cálculo
-- do lucro líquido profissional não seja afetado por custos pessoais.
-- =============================================================================

ALTER TABLE custos
  ADD COLUMN IF NOT EXISTS tipo_custo TEXT NOT NULL
  DEFAULT 'profissional'
  CHECK (tipo_custo IN ('profissional', 'pessoal'));

CREATE INDEX IF NOT EXISTS idx_custos_tipo
  ON custos (professor_id, mes_referencia, tipo_custo);
