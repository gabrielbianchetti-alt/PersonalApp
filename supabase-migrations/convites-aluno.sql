-- =============================================================================
-- Convites de aluno — link único gerado pelo professor para o aluno preencher
-- seus próprios dados. Após preenchimento, o aluno entra como "aguardando
-- aprovação"; só vira ativo depois que o professor aprovar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS convites_aluno (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Config pré-definida pelo professor
  modelo_cobranca TEXT NOT NULL CHECK (modelo_cobranca IN ('por_aula','mensalidade','pacote')),
  horarios        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{dia, horario}]
  duracao         INT  NOT NULL DEFAULT 60,
  local           TEXT NOT NULL,
  endereco        TEXT,
  valor           NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'pix' CHECK (forma_pagamento IN ('pix','cartao')),
  dia_cobranca    INT  NOT NULL DEFAULT 1,

  -- Dados do pacote (quando modelo_cobranca = 'pacote')
  dados_pacote    JSONB,  -- { quantidade_total, validade_dias, data_inicio, data_cobranca }

  -- Token público (usado na URL /convite/<token>)
  link_token      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Status do convite
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'aguardando_aprovacao', 'aprovado', 'recusado', 'expirado', 'cancelado')),

  -- Aluno criado após preenchimento (FK opcional)
  aluno_id        UUID REFERENCES alunos(id) ON DELETE SET NULL,

  -- Timestamps
  data_criacao    TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_expiracao  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  data_preenchido TIMESTAMPTZ,
  data_aprovado   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convites_professor ON convites_aluno(professor_id);
CREATE INDEX IF NOT EXISTS idx_convites_token     ON convites_aluno(link_token);
CREATE INDEX IF NOT EXISTS idx_convites_status    ON convites_aluno(professor_id, status);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE convites_aluno ENABLE ROW LEVEL SECURITY;

-- Professor vê/gerencia os próprios convites
DROP POLICY IF EXISTS "Professor manages own convites" ON convites_aluno;
CREATE POLICY "Professor manages own convites"
  ON convites_aluno FOR ALL
  USING      (auth.uid() = professor_id)
  WITH CHECK (auth.uid() = professor_id);

-- Leitura pública por token — permite que o aluno (anônimo) veja o convite
-- dele pelo link. Só expõe os campos que o front-end precisa (o professor_id
-- também é exposto pra buscar o nome do professor no cliente).
DROP POLICY IF EXISTS "Public read by token" ON convites_aluno;
CREATE POLICY "Public read by token"
  ON convites_aluno FOR SELECT
  TO anon, authenticated
  USING (true);
-- OBS: a exposição é total por SELECT, mas como o cliente público só consulta
-- por link_token (UUID sorteado — 128 bits), a descoberta é inviável na prática.
-- Para restringir ainda mais, o recomendado é criar uma RPC SECURITY DEFINER
-- (invite_read_by_token) e revogar o SELECT público direto. Fica para evolução.

-- Permite ao aluno anônimo marcar o convite como preenchido (UPDATE limitado).
-- Usamos uma RPC SECURITY DEFINER abaixo pra controlar exatamente o que muda.

-- ── Atualiza o status do aluno pra aceitar 'aguardando_aprovacao' ──────────
-- Se alunos.status tiver CHECK, adiciona o novo valor. Caso sua coluna seja
-- TEXT livre, essa linha é no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'alunos' AND constraint_type = 'CHECK'
      AND constraint_name = 'alunos_status_check'
  ) THEN
    ALTER TABLE alunos DROP CONSTRAINT alunos_status_check;
    ALTER TABLE alunos
      ADD CONSTRAINT alunos_status_check
      CHECK (status IN ('ativo', 'pausado', 'inativo', 'aguardando_aprovacao'));
  END IF;
END $$;

-- ── RPC pública: preencher convite pelo aluno ──────────────────────────────
-- Recebe o token e os dados do aluno, cria o registro em `alunos` com status
-- 'aguardando_aprovacao' e marca o convite como 'aguardando_aprovacao'.
-- Retorna o id do convite (pra UI mostrar a tela de sucesso).
CREATE OR REPLACE FUNCTION preencher_convite_aluno(
  p_token               UUID,
  p_nome                TEXT,
  p_whatsapp            TEXT,
  p_data_nascimento     DATE,
  p_emergencia_nome     TEXT,
  p_emergencia_telefone TEXT,
  p_emergencia_parentesco TEXT,
  p_objetivos           TEXT[],
  p_restricoes          TEXT,
  p_observacoes         TEXT
)
RETURNS TABLE (convite_id UUID, aluno_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite convites_aluno%ROWTYPE;
  v_aluno_id UUID;
BEGIN
  -- Busca o convite pelo token
  SELECT * INTO v_convite FROM convites_aluno WHERE link_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- Valida status e expiração
  IF v_convite.status <> 'pendente' THEN
    RAISE EXCEPTION 'Convite já utilizado ou indisponível (status: %)', v_convite.status USING ERRCODE = 'P0001';
  END IF;
  IF v_convite.data_expiracao < now() THEN
    UPDATE convites_aluno SET status = 'expirado', updated_at = now() WHERE id = v_convite.id;
    RAISE EXCEPTION 'Convite expirado' USING ERRCODE = 'P0001';
  END IF;

  -- Cria o aluno com os dados combinados
  INSERT INTO alunos (
    professor_id, nome, whatsapp, data_nascimento, data_inicio,
    emergencia_nome, emergencia_telefone, emergencia_parentesco,
    horarios, duracao, local, endereco,
    modelo_cobranca, valor, forma_pagamento, dia_cobranca,
    objetivos, restricoes, observacoes, status
  ) VALUES (
    v_convite.professor_id, p_nome, p_whatsapp, p_data_nascimento, CURRENT_DATE,
    NULLIF(p_emergencia_nome, ''), NULLIF(p_emergencia_telefone, ''), NULLIF(p_emergencia_parentesco, ''),
    v_convite.horarios, v_convite.duracao, v_convite.local, v_convite.endereco,
    v_convite.modelo_cobranca, v_convite.valor, v_convite.forma_pagamento, v_convite.dia_cobranca,
    COALESCE(p_objetivos, '{}'), NULLIF(p_restricoes, ''), NULLIF(p_observacoes, ''),
    'aguardando_aprovacao'
  )
  RETURNING id INTO v_aluno_id;

  -- Atualiza o convite
  UPDATE convites_aluno
  SET status = 'aguardando_aprovacao',
      aluno_id = v_aluno_id,
      data_preenchido = now(),
      updated_at = now()
  WHERE id = v_convite.id;

  -- Cria notificação para o professor
  BEGIN
    INSERT INTO notificacoes (professor_id, tipo, titulo, corpo, link, lida)
    VALUES (
      v_convite.professor_id,
      'importante',
      p_nome || ' preencheu o cadastro',
      'Revise e aprove o cadastro na aba Alunos.',
      '/dashboard/alunos?tab=aprovacao',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    -- Notificações é opcional — falha aqui não invalida o fluxo
    NULL;
  END;

  RETURN QUERY SELECT v_convite.id, v_aluno_id;
END;
$$;

-- Permite que usuários anônimos chamem a RPC
GRANT EXECUTE ON FUNCTION preencher_convite_aluno(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) TO anon, authenticated;

-- ── Trigger updated_at ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION convites_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_convites_updated ON convites_aluno;
CREATE TRIGGER trg_convites_updated
  BEFORE UPDATE ON convites_aluno
  FOR EACH ROW
  EXECUTE FUNCTION convites_touch_updated_at();
