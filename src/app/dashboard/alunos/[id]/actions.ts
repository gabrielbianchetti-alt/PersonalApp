'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AlunoFormData } from '@/types/aluno'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

export async function updateAlunoAction(
  alunoId: string,
  data: AlunoFormData
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const isPacote = data.modelo_cobranca === 'pacote'

  const { error } = await supabase
    .from('alunos')
    .update({
      nome: data.nome.trim(),
      whatsapp: data.whatsapp.replace(/\D/g, ''),
      data_nascimento: data.data_nascimento || null,
      data_inicio: data.data_inicio || null,
      emergencia_nome: data.emergencia_nome.trim() || null,
      emergencia_telefone: data.emergencia_telefone.replace(/\D/g, '') || null,
      emergencia_parentesco: data.emergencia_parentesco.trim() || null,
      horarios: isPacote ? [] : data.horarios,
      duracao: parseInt(data.duracao) || null,
      local: data.local || null,
      endereco: data.endereco.trim() || null,
      modelo_cobranca: data.modelo_cobranca,
      valor: parseFloat(data.valor),
      dia_cobranca: parseInt(data.dia_cobranca) || 1,
      objetivos: data.objetivos,
      restricoes: data.restricoes.trim() || null,
      observacoes: data.observacoes.trim() || null,
    })
    .eq('id', alunoId)
    .eq('professor_id', user.id)

  if (error) {
    console.error('updateAluno:', {
      code: error.code, message: error.message, details: error.details, hint: error.hint,
    })
    const parts: string[] = []
    if (error.message) parts.push(error.message)
    if (error.details) parts.push(error.details)
    if (error.hint)    parts.push(`Dica: ${error.hint}`)
    return { error: `Erro ao atualizar aluno: ${parts.join(' — ') || 'tente novamente.'}` }
  }

  revalidatePath(`/dashboard/alunos/${alunoId}`)
  revalidatePath('/dashboard/alunos')
  return {}
}

export async function deleteAlunoAction(
  alunoId: string
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }

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

  // Delete all related records in parallel
  const tables = [
    'faltas', 'cobrancas', 'termos_enviados', 'suspensoes', 'eventos_agenda', 'pacotes',
  ] as const

  await Promise.all(
    tables.map(table =>
      supabase.from(table).delete().eq('aluno_id', alunoId).eq('professor_id', user.id)
    )
  )

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
