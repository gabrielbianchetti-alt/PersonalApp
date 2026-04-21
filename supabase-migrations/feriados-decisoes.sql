-- =============================================================================
-- Decisões de feriado — o professor escolhe, mês a mês, se dá aula no feriado.
-- Por padrão a decisão é "NÃO dar aula" (ausência do registro = não dá).
-- Apenas registros onde `dar_aula = true` são exceções.
-- =============================================================================

CREATE TABLE IF NOT EXISTS feriados_decisoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_feriado  DATE NOT NULL,
  dar_aula      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professor_id, data_feriado)
);

CREATE INDEX IF NOT EXISTS idx_feriados_prof_data ON feriados_decisoes(professor_id, data_feriado);

-- RLS
ALTER TABLE feriados_decisoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor manages own feriados" ON feriados_decisoes;
CREATE POLICY "Professor manages own feriados"
  ON feriados_decisoes FOR ALL
  USING      (auth.uid() = professor_id)
  WITH CHECK (auth.uid() = professor_id);

-- Trigger pra updated_at
CREATE OR REPLACE FUNCTION feriados_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feriados_updated ON feriados_decisoes;
CREATE TRIGGER trg_feriados_updated
  BEFORE UPDATE ON feriados_decisoes
  FOR EACH ROW
  EXECUTE FUNCTION feriados_touch_updated_at();
