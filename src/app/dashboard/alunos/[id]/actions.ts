'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteAlunoAction(
  alunoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Confirm the aluno belongs to this professor before touching anything
  const { data: aluno } = await supabase
    .from('alunos')
    .select('id')
    .eq('id', alunoId)
    .eq('professor_id', user.id)
    .single()

  if (!aluno) return { error: 'Aluno não encontrado.' }

  // Delete all related records (order matters — child tables first)
  const tables = [
    { table: 'faltas',          col: 'aluno_id' },
    { table: 'cobrancas',       col: 'aluno_id' },
    { table: 'termos_enviados', col: 'aluno_id' },
    { table: 'suspensoes',      col: 'aluno_id' },
    { table: 'eventos_agenda',  col: 'aluno_id' },
  ] as const

  for (const { table, col } of tables) {
    await supabase
      .from(table)
      .delete()
      .eq(col, alunoId)
      .eq('professor_id', user.id)
  }

  // Finally delete the aluno record
  const { error } = await supabase
    .from('alunos')
    .delete()
    .eq('id', alunoId)
    .eq('professor_id', user.id)

  if (error) {
    console.error('deleteAluno:', error)
    return { error: `Erro ao excluir aluno: ${error.message}` }
  }

  return {}
}
