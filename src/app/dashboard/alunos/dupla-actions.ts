'use server'

/**
 * Aulas em Dupla — server actions auxiliares.
 * Mantidas em arquivo separado por serem usadas tanto em `/novo` quanto em `/[id]`.
 */

import { createClient } from '@/lib/supabase/server'

export interface ParceiroDisponivel {
  id: string
  nome: string
  parceiro_id: string | null    // se já está em dupla com outro
  parceiro_nome: string | null  // nome do atual parceiro (para mostrar aviso)
}

/**
 * Lista alunos do professor logado que podem ser selecionados como parceiro
 * de dupla. Inclui:
 *   - alunos sem dupla configurada (`parceiro_id IS NULL`)
 *   - o atual parceiro do `selfId` (se passado), para mostrar selecionado
 *   - quando `permitirJaEmDupla=true`: TODOS os alunos ativos (exceto selfId),
 *     usado em fluxos esporádicos da agenda onde o `parceiro_id` configurado
 *     no perfil é apenas a "preferência" e não restringe a alternância.
 *
 * NÃO inclui:
 *   - o próprio `selfId`
 *   - alunos inativos (status != 'ativo')
 *   - alunos em dupla com OUTRO aluno (`parceiro_id` existe e != selfId)
 *     — exceto quando `permitirJaEmDupla=true`
 *
 * Quando `selfId` não é passado (ex.: tela de cadastro novo), retorna apenas
 * alunos sem parceiro (e `permitirJaEmDupla` é ignorado).
 */
export async function listarParceirosDisponiveis(
  selfId?: string,
  permitirJaEmDupla?: boolean,
): Promise<{ data?: ParceiroDisponivel[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Carrega TODOS os alunos ativos do professor (vamos filtrar em memória —
  // mais simples que múltiplas queries com OR no Supabase).
  const { data: alunos, error } = await supabase
    .from('alunos')
    .select('id, nome, parceiro_id, status')
    .eq('professor_id', user.id)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })

  if (error) {
    // Coluna parceiro_id pode não existir antes da migration da Etapa 2 → fallback.
    if (isColumnMissing(error)) {
      const { data: alunosLegacy } = await supabase
        .from('alunos')
        .select('id, nome, status')
        .eq('professor_id', user.id)
        .eq('status', 'ativo')
        .order('nome', { ascending: true })
      const list = (alunosLegacy ?? [])
        .filter(a => a.id !== selfId)
        .map(a => ({ id: a.id, nome: a.nome, parceiro_id: null, parceiro_nome: null }))
      return { data: list }
    }
    console.error('listarParceirosDisponiveis:', error)
    return { error: 'Erro ao listar parceiros.' }
  }

  // Mapa id→nome para resolver nome do parceiro atual de cada aluno
  const nomeById = new Map<string, string>()
  for (const a of alunos ?? []) nomeById.set(a.id, a.nome)

  const result: ParceiroDisponivel[] = []
  for (const a of alunos ?? []) {
    if (a.id === selfId) continue
    if (!permitirJaEmDupla) {
      const semDupla      = !a.parceiro_id
      const ehMeuParceiro = selfId && a.parceiro_id === selfId
      if (!semDupla && !ehMeuParceiro) continue
    }
    result.push({
      id: a.id,
      nome: a.nome,
      parceiro_id: a.parceiro_id ?? null,
      parceiro_nome: a.parceiro_id ? nomeById.get(a.parceiro_id) ?? null : null,
    })
  }
  return { data: result }
}

function isColumnMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42703') return true
  if (err.code === 'PGRST204') return true
  if (err.code === 'PGRST205') return true
  const msg = err.message ?? ''
  return msg.includes('does not exist') || msg.includes('Could not find the')
}
