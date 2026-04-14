'use server'

import { createClient } from '@/lib/supabase/server'

// ─── types ────────────────────────────────────────────────────────────────────

export interface CustoRow {
  id: string
  professor_id: string
  nome: string
  valor: number
  tipo: 'fixo' | 'variavel'
  categoria: string
  data: string | null          // "YYYY-MM-DD" (variável only)
  mes_referencia: string       // "YYYY-MM"
  ativo: boolean               // fixos only: true = active root, false = soft-deleted
  origem_id: string | null     // null = root record; set on copies → points to root id
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
    .insert({
      professor_id: user.id,
      ...data,
      ativo: true,      // every new record starts as active
      origem_id: null,  // every new record is a root (no parent)
    })
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

  const { data: custo } = await supabase
    .from('custos')
    .select('id, tipo, origem_id, mes_referencia')
    .eq('id', id)
    .eq('professor_id', user.id)
    .single()

  if (!custo) return { error: 'Custo não encontrado.' }

  if (custo.tipo === 'fixo') {
    // ── Soft-delete logic for fixos ──────────────────────────────────────────
    //
    // The root record is the canonical source of truth (origem_id = null).
    // Copies reference the root via origem_id.
    //
    // When deleting a fixo (from any month):
    //   1. Soft-delete the root (ativo = false) → stops future replication
    //   2. Hard-delete copies in months STRICTLY AFTER the current record's month
    //      → future months lose the copy; current and prior months keep their records
    //
    // This satisfies: "delete in May → gone from June+, but stays in April and May"

    const rootId = custo.origem_id ?? custo.id   // resolve to root id

    // Step 1: soft-delete the root
    const { error: softErr } = await supabase
      .from('custos')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', rootId)
      .eq('professor_id', user.id)

    if (softErr) {
      console.error('deleteCusto (soft-delete root):', softErr)
      return { error: 'Erro ao remover custo.' }
    }

    // Step 2: hard-delete copies in future months
    const { error: cascadeErr } = await supabase
      .from('custos')
      .delete()
      .eq('professor_id', user.id)
      .eq('origem_id', rootId)
      .gt('mes_referencia', custo.mes_referencia)

    if (cascadeErr) {
      console.error('deleteCusto (cascade future copies):', cascadeErr)
      return { error: 'Erro ao remover cópias futuras.' }
    }

    return {}
  }

  // ── Variáveis: simple hard-delete ─────────────────────────────────────────
  const { error } = await supabase
    .from('custos')
    .delete()
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) { console.error('deleteCusto (variavel):', error); return { error: 'Erro ao remover custo.' } }
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

// ─── replicate active fixos into a target month ───────────────────────────────
//
// Called every time the user opens a month (on page load and on month navigation).
// Algorithm:
//   1. Find all active root fixos (ativo = true, origem_id IS NULL)
//   2. Keep only roots created at or before mesRef (no back-filling)
//   3. For each eligible root, check if a copy already exists in mesRef
//      (deduplication by nome+categoria to handle old data without proper origem_id)
//   4. Insert missing copies

export async function ensureFixosForMesAction(
  mesRef: string
): Promise<{ inserted: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { inserted: 0, error: 'Sessão expirada.' }

  // 1. All active root fixos for this professor
  const { data: roots, error: rootsErr } = await supabase
    .from('custos')
    .select('id, nome, valor, categoria, mes_referencia')
    .eq('professor_id', user.id)
    .eq('tipo', 'fixo')
    .eq('ativo', true)
    .is('origem_id', null)

  if (rootsErr) {
    console.error('[ensureFixos] roots fetch error:', rootsErr.message)
    return { inserted: 0, error: rootsErr.message }
  }
  if (!roots?.length) return { inserted: 0 }

  // 2. Only replicate roots that were created on or before the target month
  const eligibleRoots = roots.filter(r => r.mes_referencia <= mesRef)
  if (!eligibleRoots.length) return { inserted: 0 }

  // 3. Get what already exists in the target month
  const { data: existingInMonth } = await supabase
    .from('custos')
    .select('nome, categoria')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)
    .eq('tipo', 'fixo')

  // Dedup key: nome|categoria — robust even for old records without origem_id
  const existingKeys = new Set(existingInMonth?.map(e => `${e.nome}|${e.categoria}`) ?? [])

  // 4. Determine which roots need a copy
  const toInsert = eligibleRoots.filter(r => !existingKeys.has(`${r.nome}|${r.categoria}`))
  if (!toInsert.length) return { inserted: 0 }

  const { error: insertErr } = await supabase.from('custos').insert(
    toInsert.map(r => ({
      professor_id:   user.id,
      nome:           r.nome,
      valor:          r.valor,
      tipo:           'fixo' as const,
      categoria:      r.categoria,
      mes_referencia: mesRef,
      data:           null,
      ativo:          true,
      origem_id:      r.id,   // copy → points to root
    }))
  )

  if (insertErr) {
    console.error('[ensureFixos] insert error:', insertErr.message)
    return { inserted: 0, error: insertErr.message }
  }

  return { inserted: toInsert.length }
}
