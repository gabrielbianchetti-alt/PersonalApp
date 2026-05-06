-- =============================================================================
-- Etapa 1 (Aulas em Dupla) — Configuração de Timing de Cobrança
--
-- Adiciona a preferência `cobra_adiantado` na tabela preferencias_cobranca.
--   TRUE  = professor cobra ADIANTADO (início do mês). Aulas extras do mês
--           anterior entram nesta cobrança. Comportamento HISTÓRICO.
--   FALSE = professor cobra EM ATRASO (final do mês). Aulas extras do próprio
--           mês corrente entram nesta cobrança.
--
-- Default TRUE garante zero impacto: registros existentes mantêm comportamento.
-- Idempotente — pode rodar múltiplas vezes sem efeito colateral.
--
-- Como executar: cole este arquivo no Supabase SQL Editor e rode.
-- =============================================================================

ALTER TABLE preferencias_cobranca
  ADD COLUMN IF NOT EXISTS cobra_adiantado BOOLEAN NOT NULL DEFAULT TRUE;
