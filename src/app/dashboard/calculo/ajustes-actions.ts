'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

// Persistência do ajuste manual da contagem de aulas (override) por mês.
// Cálculo grava; Cálculo e Cobrança leem. Ausência de registro = sem ajuste.

/** Mapa aluno_id → contagem ajustada (override) para o mês. */
export async function getAjustesAction(
  mesRef: string,
): Promise<{ data?: Record<string, number>; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: {} }

  const { data, error } = await supabase
    .from('ajustes_aulas')
    .select('aluno_id, aulas')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)

  if (error) { console.error('getAjustes:', error); return { error: 'Erro ao buscar ajustes.' } }

  const map: Record<string, number> = {}
  for (const row of (data ?? [])) map[row.aluno_id] = row.aulas
  return { data: map }
}

export async function upsertAjusteAction(input: {
  aluno_id: string
  mes_referencia: string
  aulas: number
  motivo?: string | null
}): Promise<{ error?: string } | null> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('ajustes_aulas')
    .upsert(
      {
        professor_id:   user.id,
        aluno_id:       input.aluno_id,
        mes_referencia: input.mes_referencia,
        aulas:          input.aulas,
        motivo:         input.motivo ?? null,
      },
      { onConflict: 'professor_id,aluno_id,mes_referencia' },
    )

  if (error) { console.error('upsertAjuste:', error); return { error: 'Erro ao salvar ajuste.' } }
  revalidatePath('/dashboard', 'layout')
  return null
}

export async function deleteAjusteAction(
  aluno_id: string,
  mes_referencia: string,
): Promise<{ error?: string } | null> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('ajustes_aulas')
    .delete()
    .eq('professor_id', user.id)
    .eq('aluno_id', aluno_id)
    .eq('mes_referencia', mes_referencia)

  if (error) { console.error('deleteAjuste:', error); return { error: 'Erro ao remover ajuste.' } }
  revalidatePath('/dashboard', 'layout')
  return null
}
