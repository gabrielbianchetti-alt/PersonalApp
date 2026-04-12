'use server'

import { createClient } from '@/lib/supabase/server'
import { AlunoFormData } from '@/types/aluno'

export async function criarAlunoAction(
  data: AlunoFormData
): Promise<{ error?: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = await supabase.from('alunos').insert({
    professor_id: user.id,

    nome: data.nome.trim(),
    whatsapp: data.whatsapp.replace(/\D/g, ''),
    data_nascimento: data.data_nascimento,
    data_inicio: data.data_inicio,
    emergencia_nome: data.emergencia_nome.trim() || null,
    emergencia_telefone: data.emergencia_telefone.replace(/\D/g, '') || null,
    emergencia_parentesco: data.emergencia_parentesco.trim() || null,

    horarios: data.horarios,
    duracao: parseInt(data.duracao),
    local: data.local,
    endereco: data.endereco.trim() || null,
    modelo_cobranca: data.modelo_cobranca,
    valor: parseFloat(data.valor),
    forma_pagamento: data.forma_pagamento,

    objetivos: data.objetivos,
    restricoes: data.restricoes.trim() || null,
    observacoes: data.observacoes.trim() || null,
  })

  if (error) {
    console.error('Supabase insert error:', error)
    return { error: 'Erro ao salvar aluno. Tente novamente.' }
  }

  return null
}
