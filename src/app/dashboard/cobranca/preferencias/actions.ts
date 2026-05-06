'use server'

import { createClient } from '@/lib/supabase/server'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

type State = { error?: string; success?: boolean } | null

function isColumnMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42703') return true              // postgres native: column does not exist
  if (err.code === 'PGRST204') return true           // postgrest schema cache: column missing
  const msg = err.message ?? ''
  return msg.includes('does not exist')              // postgres native message
      || msg.includes('Could not find the')          // postgrest schema cache message
}

export async function savePreferenciasAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const base = {
    professor_id:    user.id,
    chave_pix:       (formData.get('chave_pix') as string)?.trim() || null,
    favorecido_pix:  (formData.get('favorecido_pix') as string)?.trim() || null,
    link_cartao:     (formData.get('link_cartao') as string)?.trim() || null,
    modelo_mensagem: (formData.get('modelo_mensagem') as string)?.trim() || null,
  }

  const tipoDataCobranca       = (formData.get('tipo_data_cobranca') as string) || 'dia_1'
  const formaPagamentoPadraoIn = (formData.get('forma_pagamento_padrao') as string) || 'pix'
  const formaPagamentoPadrao   = (['pix', 'cartao', 'ambos'].includes(formaPagamentoPadraoIn)
    ? formaPagamentoPadraoIn
    : 'pix') as 'pix' | 'cartao' | 'ambos'

  const cobraAdiantadoIn = (formData.get('cobra_adiantado') as string) ?? 'adiantado'
  const cobraAdiantado   = cobraAdiantadoIn !== 'atrasado' // default TRUE preserva comportamento

  const withTiming = {
    ...base,
    tipo_data_cobranca:     tipoDataCobranca,
    forma_pagamento_padrao: formaPagamentoPadrao,
    cobra_adiantado:        cobraAdiantado,
  }

  // Attempt 0: full payload (inclui cobra_adiantado, coluna mais nova)
  const { error: e0 } = await supabase
    .from('preferencias_cobranca')
    .upsert(withTiming, { onConflict: 'professor_id' })

  if (!e0) return { success: true }

  // Attempt 1: cobra_adiantado ainda não existe → salva sem ela
  if (isColumnMissing(e0)) {
    const { error: e1 } = await supabase
      .from('preferencias_cobranca')
      .upsert(
        { ...base, tipo_data_cobranca: tipoDataCobranca, forma_pagamento_padrao: formaPagamentoPadrao },
        { onConflict: 'professor_id' },
      )

    if (!e1) return { success: true }

    // Attempt 2: forma_pagamento_padrao ainda não existe → salva sem ela
    if (isColumnMissing(e1)) {
      const { error: e2 } = await supabase
        .from('preferencias_cobranca')
        .upsert({ ...base, tipo_data_cobranca: tipoDataCobranca }, { onConflict: 'professor_id' })

      if (!e2) return { success: true }

      // Attempt 3: nem tipo_data_cobranca existe → salva só o base
      if (isColumnMissing(e2)) {
        const { error: e3 } = await supabase
          .from('preferencias_cobranca')
          .upsert(base, { onConflict: 'professor_id' })

        if (!e3) return { success: true }

        console.error('savePreferencias (fallback 3) error:', e3)
        return { error: 'Erro ao salvar preferências.' }
      }

      console.error('savePreferencias (fallback 2) error:', e2)
      return { error: 'Erro ao salvar preferências.' }
    }

    console.error('savePreferencias (fallback 1) error:', e1)
    return { error: 'Erro ao salvar preferências.' }
  }

  console.error('savePreferencias error:', e0)
  return { error: 'Erro ao salvar preferências.' }
}
