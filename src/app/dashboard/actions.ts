'use server'

import { createClient } from '@/lib/supabase/server'

export async function marcarCobrancaPagoAction(
  cobrancaId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('cobrancas')
    .update({ status: 'pago' })
    .eq('id', cobrancaId)
    .eq('professor_id', user.id)

  if (error) { console.error('marcarPago:', error); return { error: 'Erro ao atualizar cobrança.' } }
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
