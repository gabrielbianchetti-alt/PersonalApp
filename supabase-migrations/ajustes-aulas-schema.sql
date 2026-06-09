-- =============================================================================
-- Ajustes de aulas — persiste o ajuste MANUAL da contagem de aulas que o
-- professor faz na tela de Cálculo ("ajustar").
--
-- Antes, esse ajuste era client-only: não persistia e não chegava à Cobrança.
-- Agora vira a fonte única do override: Cálculo grava aqui; Cálculo e Cobrança
-- leem daqui (o número ajustado passa a valer também na cobrança).
--
-- `aulas` é a contagem AJUSTADA (override absoluto) que o professor definiu
-- para aquele aluno naquele mês. A ausência de registro = sem ajuste (usa o
-- cálculo automático: previstas + extras).
--
-- Rode no SQL Editor do Supabase. Idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ajustes_aulas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id       UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  mes_referencia TEXT NOT NULL,          -- "YYYY-MM"
  aulas          INTEGER NOT NULL,       -- contagem ajustada (override absoluto)
  motivo         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professor_id, aluno_id, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_ajustes_prof_mes
  ON ajustes_aulas(professor_id, mes_referencia);

-- RLS — cada professor só enxerga/gerencia os próprios ajustes
ALTER TABLE ajustes_aulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor manages own ajustes" ON ajustes_aulas;
CREATE POLICY "Professor manages own ajustes"
  ON ajustes_aulas FOR ALL
  USING      (auth.uid() = professor_id)
  WITH CHECK (auth.uid() = professor_id);

-- Trigger pra updated_at
CREATE OR REPLACE FUNCTION ajustes_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ajustes_updated ON ajustes_aulas;
CREATE TRIGGER trg_ajustes_updated
  BEFORE UPDATE ON ajustes_aulas
  FOR EACH ROW
  EXECUTE FUNCTION ajustes_touch_updated_at();

-- =============================================================================
-- (Opcional) Realtime — para a Cobrança refletir um ajuste feito no Cálculo
-- em outra aba na hora. Só rode se a publication supabase_realtime existir.
-- =============================================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE ajustes_aulas;
