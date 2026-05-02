-- =============================================================================
-- Limpeza de cópias órfãs de custos fixos
--
-- Antes do fix em deleteCustoAction, a cascata só apagava cópias com
-- mes_referencia > o registro clicado. Quando o professor deletava uma cópia
-- do mês atual, a própria cópia ficava viva (ativo=true) — só o root ficava
-- soft-deleted (ativo=false). Resultado: o custo "voltava" no reload.
--
-- Esta migration apaga todas as cópias (origem_id IS NOT NULL) cujo root
-- está soft-deleted (ativo=false). Apenas custos do tipo fixo são afetados.
-- Não toca em roots, em variáveis, em receitas extras, em pacotes etc.
--
-- Rode no Supabase SQL Editor.
-- =============================================================================

-- Pré-checagem (opcional): mostra quantas cópias órfãs existem por professor
-- antes do DELETE.
--
-- SELECT
--   c.professor_id,
--   COUNT(*) AS copias_orfas
-- FROM custos c
-- JOIN custos r ON r.id = c.origem_id
-- WHERE c.tipo = 'fixo'
--   AND c.origem_id IS NOT NULL
--   AND r.tipo = 'fixo'
--   AND r.origem_id IS NULL
--   AND r.ativo = false
-- GROUP BY c.professor_id
-- ORDER BY copias_orfas DESC;

-- Apaga as cópias.
DELETE FROM custos c
WHERE c.tipo = 'fixo'
  AND c.origem_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM custos r
    WHERE r.id = c.origem_id
      AND r.tipo = 'fixo'
      AND r.origem_id IS NULL
      AND r.ativo = false
  );
