'use server'

import { createClient } from '@/lib/supabase/server'

type State = { error?: string; success?: boolean } | null

export async function savePreferenciasAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const payload = {
    professor_id: user.id,
    chave_pix:              (formData.get('chave_pix') as string)?.trim() || null,
    favorecido_pix:         (formData.get('favorecido_pix') as string)?.trim() || null,
    link_cartao:            (formData.get('link_cartao') as string)?.trim() || null,
    modelo_mensagem:        (formData.get('modelo_mensagem') as string)?.trim() || null,
    tipo_data_cobranca:     (formData.get('tipo_data_cobranca') as string) || 'dia_1',
  }

  const { error } = await supabase
    .from('preferencias_cobranca')
    .upsert(payload, { onConflict: 'professor_id' })

  if (error) {
    console.error('savePreferencias error:', error)
    return { error: 'Erro ao salvar preferências.' }
  }

  return { success: true }
}
