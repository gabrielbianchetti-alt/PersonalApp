'use server'

import { createClient } from '@/lib/supabase/server'
import {
  MODELO_FORMAL_CONTEUDO,
  MODELO_DESCONTRAIDO_CONTEUDO,
  type ModeloTipo,
  type ModeloTermo,
  type TermoEnviado,
} from './types'

// Re-export types so existing imports from './actions' keep working
export type { ModeloTipo, ModeloTermo, TermoEnviado } from './types'

// ─── seed defaults ────────────────────────────────────────────────────────────
// SELECT-then-insert pattern. The partial unique index on (professor_id, tipo)
// WHERE tipo IN ('formal','descontraido') prevents duplicates even on race conditions.

export async function seedModelosIfNeeded(professorId: string): Promise<void> {
  const supabase = await createClient()

  // Count existing default models for this professor
  const { count } = await supabase
    .from('modelos_termo')
    .select('id', { count: 'exact', head: true })
    .eq('professor_id', professorId)
    .in('tipo', ['formal', 'descontraido'])

  // If both already exist, nothing to do
  if ((count ?? 0) >= 2) return

  // Re-fetch tipos to decide which are missing
  const { data: existing } = await supabase
    .from('modelos_termo')
    .select('tipo')
    .eq('professor_id', professorId)
    .in('tipo', ['formal', 'descontraido'])

  const existingTipos = new Set((existing ?? []).map((r: { tipo: string }) => r.tipo))

  const toInsert = []
  if (!existingTipos.has('formal')) {
    toInsert.push({
      professor_id: professorId,
      nome: 'Formal',
      conteudo: MODELO_FORMAL_CONTEUDO,
      tipo: 'formal',
    })
  }
  if (!existingTipos.has('descontraido')) {
    toInsert.push({
      professor_id: professorId,
      nome: 'Descontraído',
      conteudo: MODELO_DESCONTRAIDO_CONTEUDO,
      tipo: 'descontraido',
    })
  }

  if (toInsert.length === 0) return

  // Insert — the partial unique index silently ignores conflicts for formal/descontraido
  await supabase.from('modelos_termo').insert(toInsert)
}

// ─── modelos ──────────────────────────────────────────────────────────────────

export async function getModelosAction(): Promise<{ data?: ModeloTermo[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('modelos_termo')
    .select('*')
    .eq('professor_id', user.id)
    .order('created_at')

  if (error) { console.error('getModelos:', error); return { error: 'Erro ao buscar modelos.' } }
  return { data: (data ?? []) as ModeloTermo[] }
}

export async function saveModeloAction(
  input: { id?: string; nome: string; conteudo: string; tipo: ModeloTipo }
): Promise<{ data?: ModeloTermo; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  if (input.id) {
    const { data: row, error } = await supabase
      .from('modelos_termo')
      .update({ nome: input.nome, conteudo: input.conteudo, updated_at: new Date().toISOString() })
      .eq('id', input.id)
      .eq('professor_id', user.id)
      .select()
      .single()
    if (error) { console.error('updateModelo:', error); return { error: 'Erro ao salvar modelo.' } }
    return { data: row as ModeloTermo }
  }

  const { data: row, error } = await supabase
    .from('modelos_termo')
    .insert({ professor_id: user.id, nome: input.nome, conteudo: input.conteudo, tipo: input.tipo })
    .select()
    .single()
  if (error) { console.error('createModelo:', error); return { error: 'Erro ao criar modelo.' } }
  return { data: row as ModeloTermo }
}

export async function deleteModeloAction(
  modeloId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('modelos_termo')
    .delete()
    .eq('id', modeloId)
    .eq('professor_id', user.id)
    .in('tipo', ['personalizado']) // safety: never delete formal/descontraido via this action

  if (error) { console.error('deleteModelo:', error); return { error: 'Erro ao excluir modelo.' } }
  return {}
}

// ─── envios ───────────────────────────────────────────────────────────────────

export async function getHistoricoAction(): Promise<{ data?: TermoEnviado[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('termos_enviados')
    .select('*, alunos(nome)')
    .eq('professor_id', user.id)
    .order('enviado_em', { ascending: false })

  if (error) { console.error('getHistorico:', error); return { error: 'Erro ao buscar histórico.' } }

  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    aluno_nome: (r.alunos as { nome: string } | null)?.nome ?? '—',
  })) as TermoEnviado[]

  return { data: rows }
}

export async function registrarEnvioAction(input: {
  aluno_id: string
  conteudo: string
  modelo_usado: ModeloTipo
}): Promise<{ data?: TermoEnviado; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: row, error } = await supabase
    .from('termos_enviados')
    .insert({
      professor_id: user.id,
      aluno_id: input.aluno_id,
      conteudo: input.conteudo,
      modelo_usado: input.modelo_usado,
      enviado_em: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) { console.error('registrarEnvio:', error); return { error: 'Erro ao registrar envio.' } }
  return { data: row as TermoEnviado }
}
