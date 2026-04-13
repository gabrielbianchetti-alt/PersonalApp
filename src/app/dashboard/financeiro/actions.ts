'use server'

import { createClient } from '@/lib/supabase/server'

export interface CustoRow {
  id: string
  professor_id: string
  nome: string
  valor: number
  tipo: 'fixo' | 'variavel'
  categoria: string
  data: string | null          // "YYYY-MM-DD" (variável only)
  mes_referencia: string       // "YYYY-MM"
  origem_id: string | null     // root id for replicated fixos — used to cascade deletes
  created_at: string
  updated_at: string
}

type CreateInput = {
  nome: string
  valor: number
  tipo: 'fixo' | 'variavel'
  categoria: string
  data?: string | null
  mes_referencia: string
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createCustoAction(
  data: CreateInput
): Promise<{ data?: CustoRow; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: row, error } = await supabase
    .from('custos')
    .insert({ professor_id: user.id, ...data })
    .select()
    .single()

  if (error) { console.error('createCusto:', error); return { error: 'Erro ao salvar custo.' } }
  return { data: row as CustoRow }
}

export async function updateCustoAction(
  id: string,
  data: Partial<CreateInput>
): Promise<{ data?: CustoRow; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: row, error } = await supabase
    .from('custos')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('professor_id', user.id)
    .select()
    .single()

  if (error) { console.error('updateCusto:', error); return { error: 'Erro ao atualizar custo.' } }
  return { data: row as CustoRow }
}

export async function deleteCustoAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // For fixos: find the root id so we can delete this record and all its replicas
  const { data: custo } = await supabase
    .from('custos')
    .select('id, tipo, origem_id')
    .eq('id', id)
    .eq('professor_id', user.id)
    .single()

  if (custo?.tipo === 'fixo') {
    // root = the original (has no origem_id itself), or the origem_id if this is already a copy
    const rootId = custo.origem_id ?? custo.id

    // Delete all replicas that point to this root
    await supabase
      .from('custos')
      .delete()
      .eq('professor_id', user.id)
      .eq('origem_id', rootId)

    // Delete the root itself
    const { error } = await supabase
      .from('custos')
      .delete()
      .eq('id', rootId)
      .eq('professor_id', user.id)

    if (error) { console.error('deleteCusto (fixo):', error); return { error: 'Erro ao remover custo.' } }
    return {}
  }

  // For variáveis: simple delete
  const { error } = await supabase
    .from('custos')
    .delete()
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) { console.error('deleteCusto:', error); return { error: 'Erro ao remover custo.' } }
  return {}
}

// ─── fetch for a month ────────────────────────────────────────────────────────

export async function getCustosForMesAction(
  mesRef: string
): Promise<{ data?: CustoRow[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('custos')
    .select('*')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)
    .order('created_at', { ascending: false })

  if (error) { console.error('getCustos:', error); return { error: 'Erro ao buscar custos.' } }
  return { data: (data ?? []) as CustoRow[] }
}

// ─── auto-replicate fixos for a new month ────────────────────────────────────
// Called when the user opens a month that has no fixos yet.
// Copies the most recent month's fixos into the target month.

export async function ensureFixosForMesAction(
  mesRef: string
): Promise<{ inserted: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { inserted: 0, error: 'Sessão expirada.' }

  // Already has fixos this month?
  const { data: existing } = await supabase
    .from('custos')
    .select('id')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)
    .eq('tipo', 'fixo')
    .limit(1)

  if (existing && existing.length > 0) return { inserted: 0 }

  // Find most recent month that has fixos (excluding target month)
  const { data: allFixos } = await supabase
    .from('custos')
    .select('id, nome, valor, categoria, mes_referencia, origem_id')
    .eq('professor_id', user.id)
    .eq('tipo', 'fixo')
    .neq('mes_referencia', mesRef)
    .order('mes_referencia', { ascending: false })

  if (!allFixos || allFixos.length === 0) return { inserted: 0 }

  const recentMes   = allFixos[0].mes_referencia
  const fixosToCopy = allFixos.filter((f) => f.mes_referencia === recentMes)
  if (fixosToCopy.length === 0) return { inserted: 0 }

  const { error } = await supabase.from('custos').insert(
    fixosToCopy.map((f) => ({
      professor_id:  user.id,
      nome:          f.nome,
      valor:         f.valor,
      tipo:          'fixo' as const,
      categoria:     f.categoria,
      mes_referencia: mesRef,
      data:          null,
      // Always point to the root original, never to a copy
      origem_id:     f.origem_id ?? f.id,
    }))
  )

  if (error) { console.error('ensureFixos:', error); return { inserted: 0, error: 'Erro ao replicar custos fixos.' } }
  return { inserted: fixosToCopy.length }
}
