-- Etapa 2 (Aulas em Dupla) — Schema base. Idempotente.
--
-- Adiciona campos OPCIONAIS na tabela alunos (configuração da dupla) e na
-- tabela eventos_agenda (vínculo entre os dois eventos pareados de uma dupla).
-- Princípio: TODAS as colunas novas são NULLABLE ou têm DEFAULT que preserva
-- comportamento. Alunos sem dupla → todos os campos NULL. Eventos individuais
-- → eh_dupla=FALSE, parceiro_evento_id=NULL.

-- 1) alunos: configuração da dupla (parceiro, frequência, valor)
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS parceiro_id        UUID,
  ADD COLUMN IF NOT EXISTS frequencia_dupla   TEXT,
  ADD COLUMN IF NOT EXISTS dias_dupla         TEXT[],
  ADD COLUMN IF NOT EXISTS valor_aula_dupla   NUMERIC(10,2);

-- FK parceiro_id → alunos.id. ON DELETE SET NULL: se um parceiro é deletado,
-- o outro automaticamente volta para individual.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'alunos' AND constraint_name = 'alunos_parceiro_id_fkey'
  ) THEN
    ALTER TABLE alunos
      ADD CONSTRAINT alunos_parceiro_id_fkey
      FOREIGN KEY (parceiro_id) REFERENCES alunos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- frequencia_dupla: 'sempre' | 'dias_especificos' | 'esporadico' (NULL = sem dupla)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'alunos' AND constraint_name = 'alunos_frequencia_dupla_check'
  ) THEN
    ALTER TABLE alunos
      ADD CONSTRAINT alunos_frequencia_dupla_check
      CHECK (frequencia_dupla IS NULL
          OR frequencia_dupla IN ('sempre', 'dias_especificos', 'esporadico'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alunos_parceiro_id
  ON alunos(parceiro_id)
  WHERE parceiro_id IS NOT NULL;

-- 2) eventos_agenda: vínculo entre os dois eventos pareados de uma aula em dupla
ALTER TABLE eventos_agenda
  ADD COLUMN IF NOT EXISTS eh_dupla            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parceiro_evento_id  UUID;

-- FK parceiro_evento_id → eventos_agenda.id. ON DELETE SET NULL: deletar um
-- evento da dupla solta a referência do par (a lógica de aplicação cuida de
-- deletar o par quando apropriado).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'eventos_agenda' AND constraint_name = 'eventos_agenda_parceiro_evento_id_fkey'
  ) THEN
    ALTER TABLE eventos_agenda
      ADD CONSTRAINT eventos_agenda_parceiro_evento_id_fkey
      FOREIGN KEY (parceiro_evento_id) REFERENCES eventos_agenda(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_parceiro_evento
  ON eventos_agenda(parceiro_evento_id)
  WHERE parceiro_evento_id IS NOT NULL;
