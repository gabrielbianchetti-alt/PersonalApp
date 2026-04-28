'use server'

import { createClient } from '@/lib/supabase/server'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

// ─── types ────────────────────────────────────────────────────────────────────

export type TipoCusto = 'profissional' | 'pessoal'

export interface CustoRow {
  id: string
  professor_id: string
  nome: string
  valor: number
  tipo: 'fixo' | 'variavel'
  tipo_custo: TipoCusto
  categoria: string
  data: string | null          // "YYYY-MM-DD" (variável only)
  mes_referencia: string       // "YYYY-MM"
  ativo: boolean               // fixos: true = active root, false = soft-deleted
  origem_id: string | null     // null = root; non-null = copy pointing to root
  created_at: string
  updated_at: string
}

type CreateInput = {
  nome: string
  valor: number
  tipo: 'fixo' | 'variavel'
  tipo_custo?: TipoCusto
  categoria: string
  data?: string | null
  mes_referencia: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the PostgREST error is "column does not exist" (code 42703). */
function isColumnMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return err.code === '42703' || (err.message ?? '').includes('does not exist')
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createCustoAction(
  data: CreateInput
): Promise<{ data?: CustoRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Default tipo_custo = 'profissional' se não passado
  const dataWithDefaults = { tipo_custo: 'profissional' as TipoCusto, ...data }

  // Try inserting with ativo + origem_id (full schema).
  // If either column doesn't exist yet, retry with only ativo, then bare.
  const base = { professor_id: user.id, ...dataWithDefaults }

  let row, error

  // Attempt 1: full schema (ativo + origem_id)
  ;({ data: row, error } = await supabase
    .from('custos')
    .insert({ ...base, ativo: true, origem_id: null })
    .select().single())

  if (error && isColumnMissing(error)) {
    // Attempt 2: ativo only (origem_id column missing)
    ;({ data: row, error } = await supabase
      .from('custos')
      .insert({ ...base, ativo: true })
      .select().single())
  }

  if (error && isColumnMissing(error)) {
    // Attempt 3: bare insert (neither column migrated yet)
    ;({ data: row, error } = await supabase
      .from('custos')
      .insert(base)
      .select().single())
  }

  if (error) { console.error('createCusto:', error); return { error: 'Erro ao salvar custo.' } }
  return { data: row as CustoRow }
}

export async function updateCustoAction(
  id: string,
  data: Partial<CreateInput>
): Promise<{ data?: CustoRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
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
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Fetch the record. Try with origem_id first; fall back if column doesn't exist.
  let custo: { id: string; tipo: string; origem_id?: string | null; mes_referencia: string } | null = null

  const { data: withOrigin, error: fetchErr1 } = await supabase
    .from('custos')
    .select('id, tipo, origem_id, mes_referencia')
    .eq('id', id).eq('professor_id', user.id).single()

  if (!fetchErr1) {
    custo = withOrigin
  } else if (isColumnMissing(fetchErr1)) {
    const { data: withoutOrigin } = await supabase
      .from('custos')
      .select('id, tipo, mes_referencia')
      .eq('id', id).eq('professor_id', user.id).single()
    custo = withoutOrigin ? { ...withoutOrigin, origem_id: null } : null
  }

  if (!custo) return { error: 'Custo não encontrado.' }

  if (custo.tipo === 'fixo') {
    // ── Soft-delete logic ─────────────────────────────────────────────────────
    // 1. Soft-delete the root (ativo = false) → stops future replication
    // 2. Hard-delete copies in months AFTER the current record's month
    //    → future months lose the copy; current + prior months keep history

    const rootId = custo.origem_id ?? custo.id

    // Step 1: soft-delete root (requires ativo column)
    const { error: softErr } = await supabase
      .from('custos')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', rootId).eq('professor_id', user.id)

    if (softErr && !isColumnMissing(softErr)) {
      console.error('deleteCusto (soft-delete):', softErr)
      return { error: 'Erro ao remover custo.' }
    }

    // Step 2: cascade-delete future copies (requires origem_id column)
    const { error: cascadeErr } = await supabase
      .from('custos').delete()
      .eq('professor_id', user.id)
      .eq('origem_id', rootId)
      .gt('mes_referencia', custo.mes_referencia)

    if (cascadeErr && !isColumnMissing(cascadeErr)) {
      console.error('deleteCusto (cascade):', cascadeErr)
      return { error: 'Erro ao remover cópias futuras.' }
    }

    // If origem_id column missing: fall back to deleting by nome+categoria in future months
    if (cascadeErr && isColumnMissing(cascadeErr)) {
      const { data: self } = await supabase
        .from('custos').select('nome, categoria')
        .eq('id', id).eq('professor_id', user.id).single()
      if (self) {
        await supabase.from('custos').delete()
          .eq('professor_id', user.id).eq('tipo', 'fixo')
          .eq('nome', self.nome).eq('categoria', self.categoria)
          .gt('mes_referencia', custo.mes_referencia)
      }
    }

    return {}
  }

  // Variáveis: simple hard-delete
  const { error } = await supabase.from('custos').delete()
    .eq('id', id).eq('professor_id', user.id)

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
    .from('custos').select('*')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)
    .or('ativo.is.null,ativo.eq.true')          // exclude soft-deleted roots (ativo=false)
    .order('created_at', { ascending: false })

  if (error) { console.error('getCustos:', error); return { error: 'Erro ao buscar custos.' } }
  return { data: (data ?? []) as CustoRow[] }
}

// ─── replicate active fixos into a target month ───────────────────────────────
//
// Algorithm:
//   1. Find all active root fixos (ativo=true, origem_id IS NULL)
//      → falls back if either column missing
//   2. Keep only roots created at or before mesRef
//   3. Dedup by nome+categoria against existing records for mesRef
//   4. Insert missing copies (with origem_id if column exists, without if not)

export async function ensureFixosForMesAction(
  mesRef: string
): Promise<{ inserted: number; error?: string }> {
  if (await shouldBlockInDemo()) return { inserted: 0, error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { inserted: 0, error: 'Sessão expirada.' }

  // ── Step 1: fetch active root fixos ─────────────────────────────────────────
  // Try full query (ativo=true AND origem_id IS NULL).
  // If origem_id column is missing → fall back to ativo=true only.
  // If ativo column is also missing → fall back to all fixos (old schema).

  let roots: { id: string; nome: string; valor: number; categoria: string; mes_referencia: string }[] | null = null
  let hasOriginIdCol = true

  const { data: r1, error: e1 } = await supabase
    .from('custos')
    .select('id, nome, valor, categoria, mes_referencia')
    .eq('professor_id', user.id)
    .eq('tipo', 'fixo')
    .eq('ativo', true)
    .is('origem_id', null)

  if (!e1) {
    roots = r1
  } else if (isColumnMissing(e1)) {
    hasOriginIdCol = false
    // origem_id column missing — try without it
    const { data: r2, error: e2 } = await supabase
      .from('custos')
      .select('id, nome, valor, categoria, mes_referencia')
      .eq('professor_id', user.id)
      .eq('tipo', 'fixo')
      .eq('ativo', true)

    if (!e2) {
      roots = r2
    } else if (isColumnMissing(e2)) {
      // ativo column also missing — get all fixos (very old schema)
      const { data: r3, error: e3 } = await supabase
        .from('custos')
        .select('id, nome, valor, categoria, mes_referencia')
        .eq('professor_id', user.id)
        .eq('tipo', 'fixo')
      if (e3) { console.error('[ensureFixos] fetch error:', e3.message); return { inserted: 0, error: e3.message } }
      roots = r3
    } else {
      console.error('[ensureFixos] fetch error:', e2.message)
      return { inserted: 0, error: e2.message }
    }
  } else {
    console.error('[ensureFixos] fetch error:', e1.message)
    return { inserted: 0, error: e1.message }
  }

  if (!roots?.length) return { inserted: 0 }

  // ── Step 2: only replicate roots created at or before the target month ───────
  const eligibleRoots = roots.filter(r => r.mes_referencia <= mesRef)
  if (!eligibleRoots.length) return { inserted: 0 }

  // ── Step 2b: deduplicate eligibleRoots themselves by nome+categoria ──────────
  // Guards against the case where old records all have origem_id=NULL (pre-migration)
  // and multiple copies of the same fixo appear as "roots".
  const rootsByKey = new Map<string, typeof eligibleRoots[0]>()
  for (const r of eligibleRoots) {
    const key = `${r.nome}|${r.categoria}`
    if (!rootsByKey.has(key)) rootsByKey.set(key, r)  // keep the earliest (first seen)
  }
  const uniqueRoots = Array.from(rootsByKey.values())

  // ── Step 3: dedup against what already exists in the target month ────────────
  const { data: existingInMonth } = await supabase
    .from('custos')
    .select('nome, categoria')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)
    .eq('tipo', 'fixo')

  const existingKeys = new Set(existingInMonth?.map(e => `${e.nome}|${e.categoria}`) ?? [])
  const toInsert = uniqueRoots.filter(r => !existingKeys.has(`${r.nome}|${r.categoria}`))
  if (!toInsert.length) return { inserted: 0 }

  // ── Step 4: insert copies ────────────────────────────────────────────────────
  // Try with ativo + origem_id; fall back progressively if columns missing.

  const baseRows = toInsert.map(r => ({
    professor_id:   user.id,
    nome:           r.nome,
    valor:          r.valor,
    tipo:           'fixo' as const,
    categoria:      r.categoria,
    mes_referencia: mesRef,
    data:           null as null,
  }))

  // Attempt 1: with ativo + origem_id
  const { error: ie1 } = await supabase.from('custos').insert(
    baseRows.map((r, i) => ({ ...r, ativo: true, origem_id: toInsert[i].id }))
  )
  if (!ie1) return { inserted: toInsert.length }

  if (isColumnMissing(ie1)) {
    // Attempt 2: with ativo only (origem_id missing)
    const { error: ie2 } = await supabase.from('custos').insert(
      baseRows.map(r => ({ ...r, ativo: true }))
    )
    if (!ie2) return { inserted: toInsert.length }

    if (isColumnMissing(ie2)) {
      // Attempt 3: bare rows (neither column exists)
      const { error: ie3 } = await supabase.from('custos').insert(baseRows)
      if (ie3) { console.error('[ensureFixos] bare insert error:', ie3.message); return { inserted: 0, error: ie3.message } }
      return { inserted: toInsert.length }
    }

    console.error('[ensureFixos] insert error:', ie2.message)
    return { inserted: 0, error: ie2.message }
  }

  console.error('[ensureFixos] insert error:', ie1.message)
  return { inserted: 0, error: ie1.message }
}

// ─── receitas extras ──────────────────────────────────────────────────────────

export interface ReceitaExtraRow {
  id: string
  professor_id: string
  descricao: string
  valor: number
  data: string | null
  mes_referencia: string
  created_at: string
}

export async function createReceitaExtraAction(input: {
  descricao: string
  valor: number
  data?: string | null
  mes_referencia: string
}): Promise<{ data?: ReceitaExtraRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('receitas_extras')
    .insert({ professor_id: user.id, ...input })
    .select()
    .single()

  if (error) { console.error('createReceitaExtra:', error); return { error: 'Erro ao salvar receita.' } }
  return { data: data as ReceitaExtraRow }
}

export async function getReceitasExtrasForMesAction(
  mesRef: string
): Promise<{ data?: ReceitaExtraRow[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('receitas_extras')
    .select('*')
    .eq('professor_id', user.id)
    .eq('mes_referencia', mesRef)
    .order('created_at', { ascending: false })

  if (error) { console.error('getReceitasExtras:', error); return { error: 'Erro ao buscar receitas.' } }
  return { data: (data ?? []) as ReceitaExtraRow[] }
}

export async function deleteReceitaExtraAction(
  id: string
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('receitas_extras')
    .delete()
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) { console.error('deleteReceitaExtra:', error); return { error: 'Erro ao remover receita.' } }
  return {}
}

// ─── historico financeiro (multi-month for chart) ─────────────────────────────

export interface HistoricoMes {
  mes: string           // "YYYY-MM"
  custos: number
  receitas_extras: number
}

export async function getHistoricoFinanceiroAction(
  meses: string[]
): Promise<{ data?: HistoricoMes[]; error?: string }> {
  if (!meses.length) return { data: [] }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const [custosRes, receitasRes] = await Promise.all([
    supabase
      .from('custos')
      .select('mes_referencia, valor')
      .eq('professor_id', user.id)
      .in('mes_referencia', meses)
      .or('ativo.is.null,ativo.eq.true'),
    supabase
      .from('receitas_extras')
      .select('mes_referencia, valor')
      .eq('professor_id', user.id)
      .in('mes_referencia', meses),
  ])

  const result: HistoricoMes[] = meses.map(mes => ({
    mes,
    custos: (custosRes.data ?? [])
      .filter(c => c.mes_referencia === mes)
      .reduce((s, c) => s + Number(c.valor), 0),
    receitas_extras: (receitasRes.data ?? [])
      .filter(r => r.mes_referencia === mes)
      .reduce((s, r) => s + Number(r.valor), 0),
  }))

  return { data: result }
}
