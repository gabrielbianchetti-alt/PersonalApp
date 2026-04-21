'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

export interface FeriadoDecisao {
  data_feriado: string
  dar_aula: boolean
}

/** Retorna as decisões salvas para o mês (ex: "2026-04") */
export async function getFeriadoDecisoesAction(
  mesRef: string
): Promise<{ data?: FeriadoDecisao[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const [y, m] = mesRef.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('feriados_decisoes')
    .select('data_feriado, dar_aula')
    .eq('professor_id', user.id)
    .gte('data_feriado', start)
    .lte('data_feriado', end)

  if (error) { console.error('getFeriadoDecisoes:', error); return { error: error.message } }
  return { data: (data ?? []) as FeriadoDecisao[] }
}

/** Salva (upsert) a decisão pro feriado */
export async function saveFeriadoDecisaoAction(
  dataFeriado: string,
  darAula: boolean,
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('feriados_decisoes')
    .upsert({
      professor_id: user.id,
      data_feriado: dataFeriado,
      dar_aula: darAula,
    }, { onConflict: 'professor_id,data_feriado' })

  if (error) { console.error('saveFeriadoDecisao:', error); return { error: error.message } }
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard/calculo')
  return {}
}
