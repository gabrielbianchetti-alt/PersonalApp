-- =============================================================================
-- alunos.forma_pagamento — remove a obrigatoriedade.
--
-- O campo de forma de pagamento por aluno foi substituído por
-- `preferencias_cobranca.forma_pagamento_padrao` (definido por professor).
-- O cadastro de aluno (criarAlunoAction) e a edição já não enviam mais essa
-- coluna, então o NOT NULL antigo quebra o INSERT com erro 23502.
--
-- Esta migration apenas afrouxa a constraint — a coluna continua existindo
-- para não quebrar a RPC `preencher_convite_aluno` (convites-aluno.sql), que
-- ainda copia `convites_aluno.forma_pagamento` para `alunos.forma_pagamento`.
-- A remoção definitiva da coluna fica para uma migration futura, junto com a
-- atualização da RPC.
--
-- Rode no Supabase SQL Editor.
-- =============================================================================

ALTER TABLE alunos
  ALTER COLUMN forma_pagamento DROP NOT NULL;
