'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { AlunoFormData, addDays } from '@/types/aluno'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

export async function criarAlunoAction(
  data: AlunoFormData
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada. Faça login novamente.' }

  const isPacote = data.modelo_cobranca === 'pacote'

  const { data: row, error } = await supabase
    .from('alunos')
    .insert({
      professor_id: user.id,

      nome: data.nome.trim(),
      whatsapp: data.whatsapp.replace(/\D/g, ''),
      data_nascimento: data.data_nascimento,
      data_inicio: data.data_inicio,
      emergencia_nome: data.emergencia_nome.trim() || null,
      emergencia_telefone: data.emergencia_telefone.replace(/\D/g, '') || null,
      emergencia_parentesco: data.emergencia_parentesco.trim() || null,

      // Pacote não usa horários fixos
      horarios: isPacote ? [] : data.horarios,
      duracao: parseInt(data.duracao),
      local: data.local,
      endereco: data.endereco.trim() || null,
      modelo_cobranca: data.modelo_cobranca,
      valor: parseFloat(data.valor),
      forma_pagamento: data.forma_pagamento,
      dia_cobranca: parseInt(data.dia_cobranca) || 1,

      objetivos: data.objetivos,
      restricoes: data.restricoes.trim() || null,
      observacoes: data.observacoes.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return { error: 'Erro ao salvar aluno. Tente novamente.' }
  }

  // Cria o primeiro pacote para alunos tipo pacote
  if (isPacote && row) {
    const qtd        = parseInt(data.pacote_quantidade) || 0
    const validade   = parseInt(data.pacote_validade_dias) || 30
    const vencimento = addDays(data.pacote_data_inicio, validade)
    const { error: pacoteErr } = await supabase.from('pacotes').insert({
      professor_id:     user.id,
      aluno_id:         (row as { id: string }).id,
      quantidade_total: qtd,
      quantidade_usada: 0,
      valor:            parseFloat(data.valor),
      validade_dias:    validade,
      data_inicio:      data.pacote_data_inicio,
      data_vencimento:  vencimento,
      data_cobranca:    data.pacote_data_cobranca,
      status:           'ativo',
    })
    if (pacoteErr) console.error('Erro ao criar pacote inicial:', pacoteErr)
  }

  revalidatePath('/dashboard/alunos')
  revalidatePath('/dashboard/pacotes')
  return { data: row as Record<string, unknown> }
}
