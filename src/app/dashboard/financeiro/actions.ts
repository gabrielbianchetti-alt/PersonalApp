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

  // Fetch the record — select only columns that always exist (no origem_id).
  // If origem_id column exists in the DB it will be read via the fallback below.
  const { data: custo } = await supabase
    .from('custos')
    .select('id, tipo, nome, categoria')
    .eq('id', id)
    .eq('professor_id', user.id)
    .single()

  if (custo?.tipo === 'fixo') {
    // Try cascade-delete via origem_id (requires DB migration).
    // If the column exists: delete all replicas pointing to this root, then the root.
    // If the column doesn't exist: fall back to nome+categoria matching (deletes all
    //   months' copies of the same fixo, which is the intended "delete everywhere" behaviour).

    // Attempt 1: origem_id-based cascade
    const { data: withOrigin } = await supabase
      .from('custos')
      .select('id, origem_id')
      .eq('id', id)
      .eq('professor_id', user.id)
      .single()

    const hasOriginId = withOrigin && 'origem_id' in withOrigin
    if (hasOriginId) {
      const rootId = (withOrigin as { id: string; origem_id: string | null }).origem_id ?? id

      // Delete all replicas pointing to root
      await supabase.from('custos').delete()
        .eq('professor_id', user.id).eq('origem_id', rootId)

      // Delete the root itself
      const { error } = await supabase.from('custos').delete()
        .eq('id', rootId).eq('professor_id', user.id)
      if (error) { console.error('deleteCusto (fixo, cascade):', error); return { error: 'Erro ao remover custo.' } }
      return {}
    }

    // Fallback: delete all fixos with same nome+categoria across all months
    const { error } = await supabase.from('custos').delete()
      .eq('professor_id', user.id)
      .eq('tipo', 'fixo')
      .eq('nome', custo.nome)
      .eq('categoria', custo.categoria)
    if (error) { console.error('deleteCusto (fixo, fallback):', error); return { error: 'Erro ao remover custo.' } }
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

  // 1. Already has fixos this month? Nothing to do.
  const { data: existing } = await supabase
    .from('custos')
    .select('id')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)
    .eq('tipo', 'fixo')
    .limit(1)

  if (existing && existing.length > 0) return { inserted: 0 }

  // 2. Find most recent month that has fixos (excluding target month).
  //    origem_id is intentionally NOT in the SELECT — if the column does not
  //    exist in the DB, Supabase returns data=null for the entire query and the
  //    function would exit silently. We only need it in the INSERT, not here.
  const { data: allFixos, error: fetchErr } = await supabase
    .from('custos')
    .select('id, nome, valor, categoria, mes_referencia')
    .eq('professor_id', user.id)
    .eq('tipo', 'fixo')
    .neq('mes_referencia', mesRef)
    .order('mes_referencia', { ascending: false })

  if (fetchErr) {
    console.error('[ensureFixos] fetch error:', fetchErr.message)
    return { inserted: 0, error: fetchErr.message }
  }
  if (!allFixos || allFixos.length === 0) return { inserted: 0 }

  const recentMes   = allFixos[0].mes_referencia
  const fixosToCopy = allFixos.filter((f) => f.mes_referencia === recentMes)
  if (fixosToCopy.length === 0) return { inserted: 0 }

  // 3. Insert copies for the target month.
  //    Try with origem_id first (needs DB migration). If the column doesn't exist
  //    yet, the insert will fail and we retry without it so replication still works.
  const withOrigin = fixosToCopy.map((f) => ({
    professor_id:   user.id,
    nome:           f.nome,
    valor:          f.valor,
    tipo:           'fixo' as const,
    categoria:      f.categoria,
    mes_referencia: mesRef,
    data:           null as null,
    origem_id:      f.id,   // always point to the record we're copying from
  }))

  const { error: insertErr } = await supabase.from('custos').insert(withOrigin)

  if (insertErr) {
    console.warn('[ensureFixos] insert with origem_id failed, retrying without:', insertErr.message)
    // Fallback: same insert without the origem_id column
    const withoutOrigin = fixosToCopy.map((f) => ({
      professor_id:   user.id,
      nome:           f.nome,
      valor:          f.valor,
      tipo:           'fixo' as const,
      categoria:      f.categoria,
      mes_referencia: mesRef,
      data:           null as null,
    }))
    const { error: fallbackErr } = await supabase.from('custos').insert(withoutOrigin)
    if (fallbackErr) {
      console.error('[ensureFixos] fallback insert error:', fallbackErr.message)
      return { inserted: 0, error: fallbackErr.message }
    }
  }

  return { inserted: fixosToCopy.length }
}
