'use server'

import { createClient } from '@/lib/supabase/server'

// Upsert a cobrança record with status 'pago' (creates if not exists)
export async function upsertCobrancaPagoAction(
  alunoId: string,
  mesRef: string,
  valor: number,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('cobrancas')
    .upsert(
      {
        professor_id: user.id,
        aluno_id: alunoId,
        mes_referencia: mesRef,
        valor,
        status: 'pago',
        mensagem: null,
      },
      { onConflict: 'professor_id,aluno_id,mes_referencia' }
    )
    .select('id')
    .single()

  if (error) { console.error('upsertCobrancaPago:', error); return { error: 'Erro ao registrar pagamento.' } }
  return { id: data.id }
}

// Revert a paid cobrança back to 'pendente'
export async function desfazerPagoAction(
  cobrancaId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('cobrancas')
    .update({ status: 'pendente' })
    .eq('id', cobrancaId)
    .eq('professor_id', user.id)

  if (error) { console.error('desfazerPago:', error); return { error: 'Erro ao desfazer pagamento.' } }
  return {}
}

export async function saveMetaAction(
  metaMensal: number
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('metas')
    .upsert({ professor_id: user.id, meta_mensal: metaMensal }, { onConflict: 'professor_id' })

  if (error) { console.error('saveMeta:', error); return { error: 'Erro ao salvar meta.' } }
  return {}
}
