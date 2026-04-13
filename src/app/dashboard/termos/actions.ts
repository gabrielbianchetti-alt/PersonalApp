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
// Uses upsert with onConflict so concurrent calls are safe and idempotent.
// The unique constraint (professor_id, tipo) must exist — see SQL migration.

export async function seedModelosIfNeeded(professorId: string): Promise<void> {
  const supabase = await createClient()

  // Check each tipo individually to avoid inserting a tipo that already exists
  const { data: existing } = await supabase
    .from('modelos_termo')
    .select('tipo')
    .eq('professor_id', professorId)

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

  // ignoreDuplicates: true protects against race conditions (two parallel SSR calls)
  await supabase
    .from('modelos_termo')
    .upsert(toInsert, { onConflict: 'professor_id,tipo', ignoreDuplicates: true })
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
