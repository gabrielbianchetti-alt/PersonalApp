'use server'

import { createClient } from '@/lib/supabase/server'

export type CobrancaStatus = 'pendente' | 'enviado' | 'pago'

export async function upsertCobrancaAction(data: {
  aluno_id: string
  mes_referencia: string
  valor: number
  status: CobrancaStatus
  mensagem: string
}): Promise<{ error?: string; id?: string } | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: row, error } = await supabase
    .from('cobrancas')
    .upsert(
      {
        professor_id: user.id,
        aluno_id: data.aluno_id,
        mes_referencia: data.mes_referencia,
        valor: data.valor,
        status: data.status,
        mensagem: data.mensagem,
      },
      { onConflict: 'professor_id,aluno_id,mes_referencia' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('upsertCobranca error:', error)
    return { error: 'Erro ao salvar cobrança.' }
  }

  return { id: row.id }
}

export async function updateStatusAction(
  cobrancaId: string,
  status: CobrancaStatus
): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('cobrancas')
    .update({ status })
    .eq('id', cobrancaId)
    .eq('professor_id', user.id)

  if (error) return { error: 'Erro ao atualizar status.' }
  return null
}
