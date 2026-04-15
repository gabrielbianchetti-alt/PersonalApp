'use server'

import { createClient } from '@/lib/supabase/server'

// ─── types ────────────────────────────────────────────────────────────────────

export interface FaltaRow {
  id: string
  professor_id: string
  aluno_id: string
  data_falta: string          // "YYYY-MM-DD"
  culpa: 'aluno' | 'professor'
  status: 'pendente' | 'reposta' | 'credito' | 'vencida' | 'cobranca'
  tipo: 'falta' | 'cancelamento'  // falta = no-show, cancelamento = advance notice
  horario_falta: string | null    // "HH:MM" — original lesson time
  data_reposicao: string | null  // "YYYY-MM-DD"
  credito_valor: number | null
  mes_validade: string | null    // "YYYY-MM" — month the credit is valid for
  prazo_vencimento: string    // "YYYY-MM-DD"
  observacao: string | null
  created_at: string
  updated_at: string
  // joined
  aluno_nome?: string
}

export interface PrefsF {
  ativo: boolean
  prazo_dias: number
  alerta_dias: number
}

// ─── preferências ────────────────────────────────────────────────────────────

export async function getPreferenciasAction(): Promise<{ data?: PrefsF; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data } = await supabase
    .from('preferencias_faltas')
    .select('ativo, prazo_dias, alerta_dias')
    .eq('professor_id', user.id)
    .single()

  if (!data) return { data: { ativo: false, prazo_dias: 30, alerta_dias: 5 } }
  return { data: data as PrefsF }
}

export async function savePreferenciasAction(
  prefs: PrefsF
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('preferencias_faltas')
    .upsert({ professor_id: user.id, ...prefs }, { onConflict: 'professor_id' })

  if (error) { console.error('savePrefs:', error); return { error: 'Erro ao salvar preferências.' } }
  return {}
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getFaltasAction(): Promise<{ data?: FaltaRow[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('faltas')
    .select('id, professor_id, aluno_id, data_falta, culpa, status, tipo, horario_falta, data_reposicao, credito_valor, mes_validade, prazo_vencimento, observacao, created_at, updated_at, alunos(nome)')
    .eq('professor_id', user.id)
    .order('data_falta', { ascending: false })

  if (error) { console.error('getFaltas:', error); return { error: 'Erro ao buscar faltas.' } }

  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    aluno_nome: (r.alunos as { nome: string } | null)?.nome ?? '—',
  })) as FaltaRow[]

  return { data: rows }
}

export async function createFaltaAction(input: {
  aluno_id: string
  data_falta: string
  culpa: 'aluno' | 'professor'
  prazo_dias: number
  tipo?: 'falta' | 'cancelamento'
  horario_falta?: string | null
  observacao?: string
}): Promise<{ data?: FaltaRow; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // compute prazo_vencimento
  const dataObj = new Date(input.data_falta + 'T12:00:00')
  dataObj.setDate(dataObj.getDate() + input.prazo_dias)
  const prazo_vencimento = dataObj.toISOString().slice(0, 10)

  const { data: row, error } = await supabase
    .from('faltas')
    .insert({
      professor_id: user.id,
      aluno_id: input.aluno_id,
      data_falta: input.data_falta,
      culpa: input.culpa,
      tipo: input.tipo ?? 'falta',
      horario_falta: input.horario_falta ?? null,
      status: 'pendente',
      prazo_vencimento,
      observacao: input.observacao ?? null,
    })
    .select()
    .single()

  if (error) { console.error('createFalta:', error.code, error.message); return { error: 'Erro ao registrar falta.' } }
  return { data: row as FaltaRow }
}

export async function resolveFaltaAction(
  id: string,
  resolution:
    | { tipo: 'reposta'; data_reposicao: string; horario_reposicao?: string; aluno_id?: string; aluno_nome?: string; duracao?: number }
    | { tipo: 'credito'; credito_valor: number }
    | { tipo: 'cobranca' }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (resolution.tipo === 'reposta') {
    updates.status = 'reposta'
    updates.data_reposicao = resolution.data_reposicao

    // If a specific time is provided, also create a reposicao event in the agenda
    if (resolution.horario_reposicao && resolution.aluno_id) {
      const nome = resolution.aluno_nome?.split(' ')[0] ?? 'Aluno'
      await supabase
        .from('eventos_agenda')
        .insert({
          professor_id: user.id,
          tipo: 'reposicao',
          titulo: `Reposição — ${nome}`,
          aluno_id: resolution.aluno_id,
          data_especifica: resolution.data_reposicao,
          horario_inicio: resolution.horario_reposicao,
          duracao: resolution.duracao ?? 60,
        })
    }
  } else if (resolution.tipo === 'credito') {
    updates.status = 'credito'
    updates.credito_valor = resolution.credito_valor
    // Credit is valid only for the NEXT calendar month
    const now = new Date()
    const nm = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`
    updates.mes_validade = nm
  } else {
    // cobranca — resolve with no credit, no reschedule
    updates.status = 'cobranca'
  }

  const { error } = await supabase
    .from('faltas')
    .update(updates)
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) {
    console.error('resolveFalta:', error.code, error.message, error.hint ?? '')
    return { error: `[${error.code}] ${error.message}${error.hint ? ' — ' + error.hint : ''}` }
  }
  return {}
}

export async function desfazerFaltaAction(
  id: string,
  data_falta: string,
  prazoDias: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Recalculate prazo_vencimento from original data_falta
  const dataObj = new Date(data_falta + 'T12:00:00')
  dataObj.setDate(dataObj.getDate() + prazoDias)
  const prazo_vencimento = dataObj.toISOString().slice(0, 10)

  const { error } = await supabase
    .from('faltas')
    .update({
      status: 'pendente',
      data_reposicao: null,
      credito_valor: null,
      mes_validade: null,
      prazo_vencimento,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) { console.error('desfazerFalta:', error); return { error: 'Erro ao desfazer resolução.' } }
  return {}
}

export async function deleteFaltaAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('faltas')
    .delete()
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) { console.error('deleteFalta:', error); return { error: 'Erro ao remover falta.' } }
  return {}
}

// ─── processar vencidos ───────────────────────────────────────────────────────
// Marks all pendentes past their prazo_vencimento as 'vencida'.

export async function processVencidosAction(): Promise<{ updated: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { updated: 0, error: 'Sessão expirada.' }

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('faltas')
    .update({ status: 'vencida', updated_at: new Date().toISOString() })
    .eq('professor_id', user.id)
    .eq('status', 'pendente')
    .lt('prazo_vencimento', today)
    .select('id')

  if (error) { console.error('processVencidos:', error); return { updated: 0, error: 'Erro ao processar vencidos.' } }
  return { updated: (data ?? []).length }
}

// ─── créditos pendentes por aluno (para cobrança) ─────────────────────────────
// Pass mesRef ("YYYY-MM") to filter credits valid for that billing month.
// Credits with mes_validade = null are legacy and shown regardless (backward compat).

export async function getCreditosPorAlunoAction(mesRef?: string): Promise<{
  data?: Record<string, number>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  let query = supabase
    .from('faltas')
    .select('aluno_id, credito_valor, mes_validade')
    .eq('professor_id', user.id)
    .eq('status', 'credito')

  if (mesRef) {
    // Show: credits with no expiry (legacy) OR credits valid for this specific month
    query = query.or(`mes_validade.is.null,mes_validade.eq.${mesRef}`)
  }

  const { data, error } = await query

  if (error) { console.error('getCreditos:', error); return { error: 'Erro ao buscar créditos.' } }

  const map: Record<string, number> = {}
  for (const row of (data ?? [])) {
    if (row.credito_valor) {
      map[row.aluno_id] = (map[row.aluno_id] ?? 0) + Number(row.credito_valor)
    }
  }
  return { data: map }
}
