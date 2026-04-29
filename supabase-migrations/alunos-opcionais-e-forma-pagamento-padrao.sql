-- =============================================================================
-- 1) Tornar `data_nascimento` e `local` opcionais em `alunos`
-- 2) Adicionar `forma_pagamento_padrao` em `preferencias_cobranca`
--    (substitui o campo por-aluno; aplicado para TODAS as cobranças)
-- Rode no Supabase SQL Editor.
-- =============================================================================

-- ─── 1. Alunos: data_nascimento + local podem ficar em branco ───────────────
ALTER TABLE alunos
  ALTER COLUMN data_nascimento DROP NOT NULL;

ALTER TABLE alunos
  ALTER COLUMN local DROP NOT NULL;

-- ─── 2. Preferências de cobrança: nova coluna ───────────────────────────────
ALTER TABLE preferencias_cobranca
  ADD COLUMN IF NOT EXISTS forma_pagamento_padrao TEXT NOT NULL
  DEFAULT 'pix'
  CHECK (forma_pagamento_padrao IN ('pix', 'cartao', 'ambos'));

-- (Opcional) backfill para professores que já tinham apenas Pix configurado:
-- UPDATE preferencias_cobranca SET forma_pagamento_padrao = 'pix'
--   WHERE forma_pagamento_padrao IS NULL;
