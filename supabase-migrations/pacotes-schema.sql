-- =============================================================================
-- Pacotes de aulas — schema + RLS + link com eventos_agenda
-- Rode no Supabase SQL Editor.
-- Requer: tabela `alunos` existente com coluna modelo_cobranca TEXT.
-- =============================================================================

-- 1) Aceita o novo valor "pacote" em alunos.modelo_cobranca.
-- Se houver CHECK existente, remova antes. Caso sua coluna não tenha CHECK,
-- a linha DROP CONSTRAINT falha silenciosamente — remova-a ou ignore o erro.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'alunos' AND constraint_type = 'CHECK'
      AND constraint_name = 'alunos_modelo_cobranca_check'
  ) THEN
    ALTER TABLE alunos DROP CONSTRAINT alunos_modelo_cobranca_check;
  END IF;
END $$;

ALTER TABLE alunos
  ADD CONSTRAINT alunos_modelo_cobranca_check
  CHECK (modelo_cobranca IN ('por_aula', 'mensalidade', 'pacote'));

-- 2) Tabela principal: pacotes
CREATE TABLE IF NOT EXISTS pacotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id      UUID NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  aluno_id          UUID NOT NULL REFERENCES alunos(id)       ON DELETE CASCADE,

  quantidade_total  INT  NOT NULL CHECK (quantidade_total > 0),
  quantidade_usada  INT  NOT NULL DEFAULT 0 CHECK (quantidade_usada >= 0),

  valor             NUMERIC(10,2) NOT NULL,
  validade_dias     INT  NOT NULL CHECK (validade_dias > 0),

  data_inicio       DATE NOT NULL,
  data_vencimento   DATE NOT NULL,
  data_cobranca     DATE NOT NULL,

  status            TEXT NOT NULL DEFAULT 'ativo'
                    CHECK (status IN ('ativo', 'vencido', 'finalizado')),

  renovacao_de      UUID REFERENCES pacotes(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacotes_professor      ON pacotes(professor_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_aluno          ON pacotes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_professor_status ON pacotes(professor_id, status);

-- 3) RLS: professor só vê/mexe nos pacotes dele
ALTER TABLE pacotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor manages own pacotes" ON pacotes;
CREATE POLICY "Professor manages own pacotes"
  ON pacotes FOR ALL
  USING      (auth.uid() = professor_id)
  WITH CHECK (auth.uid() = professor_id);

-- 4) Vincular eventos_agenda ao pacote (quando uma aula consome do pacote)
ALTER TABLE eventos_agenda
  ADD COLUMN IF NOT EXISTS pacote_id UUID REFERENCES pacotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_pacote
  ON eventos_agenda(pacote_id)
  WHERE pacote_id IS NOT NULL;

-- 5) (Opcional) Trigger para manter updated_at
CREATE OR REPLACE FUNCTION pacotes_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pacotes_updated ON pacotes;
CREATE TRIGGER trg_pacotes_updated
  BEFORE UPDATE ON pacotes
  FOR EACH ROW
  EXECUTE FUNCTION pacotes_touch_updated_at();
