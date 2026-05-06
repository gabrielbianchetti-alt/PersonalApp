-- Etapa 1 (Aulas em Dupla) — Configuração de Timing de Cobrança. Idempotente.
--
-- Adiciona a preferência `cobra_adiantado` em preferencias_cobranca.
--   TRUE  = professor cobra ADIANTADO (início do mês). Aulas extras do mês
--           anterior entram nesta cobrança. Comportamento HISTÓRICO.
--   FALSE = professor cobra EM ATRASO (final do mês). Aulas extras do próprio
--           mês corrente entram nesta cobrança.
--
-- Default TRUE garante zero impacto: registros existentes mantêm comportamento.

ALTER TABLE preferencias_cobranca
  ADD COLUMN IF NOT EXISTS cobra_adiantado BOOLEAN NOT NULL DEFAULT TRUE;
