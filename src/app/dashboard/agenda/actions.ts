'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

export type EventoTipo = 'aula' | 'reposicao' | 'reuniao' | 'bloqueado' | 'refeicao' | 'outro' | 'aula_extra'

export interface EventoAgendaRow {
  id: string
  professor_id: string
  tipo: EventoTipo
  titulo: string
  aluno_id: string | null
  dia_semana: string | null
  data_especifica: string | null
  horario_inicio: string
  duracao: number
  cor: string | null
  observacao: string | null
  valor: number | null
  serie_id: string | null
  pacote_id: string | null
  created_at: string
  updated_at: string
}

type CreateInput = {
  tipo: EventoTipo
  titulo: string
  aluno_id?: string | null
  dia_semana?: string | null
  data_especifica?: string | null
  horario_inicio: string
  duracao: number
  cor?: string | null
  observacao?: string | null
  valor?: number | null
  serie_id?: string | null
  pacote_id?: string | null
}

export async function createEventoAction(
  data: CreateInput
): Promise<{ data?: EventoAgendaRow; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  let pacoteIdFinal: string | null = data.pacote_id ?? null

  // Auto-detect: aulas/reposições de alunos pacote consomem o pacote ativo
  if (!pacoteIdFinal && data.aluno_id && (data.tipo === 'aula' || data.tipo === 'reposicao')) {
    const { data: aluno } = await supabase
      .from('alunos')
      .select('modelo_cobranca')
      .eq('id', data.aluno_id)
      .eq('professor_id', user.id)
      .single()
    if (aluno?.modelo_cobranca === 'pacote') {
      const { data: pkg } = await supabase
        .from('pacotes')
        .select('id')
        .eq('aluno_id', data.aluno_id)
        .eq('professor_id', user.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!pkg) return { error: 'Este aluno é pacote mas não tem pacote ativo. Renove o pacote primeiro.' }
      pacoteIdFinal = pkg.id as string
    }
  }

  // If linked to a pacote, validate capacity and expiration.
  if (pacoteIdFinal && (data.tipo === 'aula' || data.tipo === 'reposicao')) {
    const { data: p } = await supabase
      .from('pacotes')
      .select('quantidade_total, quantidade_usada, data_vencimento, status')
      .eq('id', pacoteIdFinal)
      .eq('professor_id', user.id)
      .single()
    if (!p) return { error: 'Pacote não encontrado.' }
    const restantes = p.quantidade_total - p.quantidade_usada
    if (restantes <= 0)                                        return { error: 'Pacote sem aulas restantes.' }
    const today = new Date().toISOString().split('T')[0]
    if (p.data_vencimento < today || p.status === 'vencido')   return { error: 'Pacote vencido.' }
    if (p.status === 'finalizado')                             return { error: 'Pacote já finalizado.' }
  }

  const { data: row, error } = await supabase
    .from('eventos_agenda')
    .insert({ professor_id: user.id, ...data, pacote_id: pacoteIdFinal })
    .select()
    .single()

  if (error) {
    console.error('createEvento error:', error.code, error.message, error.details, error.hint)
    return { error: `Erro ao criar evento: ${error.message ?? error.code}` }
  }

  // Consumir aula do pacote
  if (pacoteIdFinal && (data.tipo === 'aula' || data.tipo === 'reposicao')) {
    const { data: p } = await supabase
      .from('pacotes')
      .select('quantidade_total, quantidade_usada')
      .eq('id', pacoteIdFinal)
      .eq('professor_id', user.id)
      .single()
    if (p) {
      const novaUsada = (p.quantidade_usada ?? 0) + 1
      const novoStatus = novaUsada >= p.quantidade_total ? 'finalizado' : 'ativo'
      await supabase
        .from('pacotes')
        .update({ quantidade_usada: novaUsada, status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', pacoteIdFinal)
        .eq('professor_id', user.id)
    }
  }

  return { data: row as EventoAgendaRow }
}

export async function updateEventoAction(
  id: string,
  data: Partial<CreateInput>
): Promise<{ data?: EventoAgendaRow; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: row, error } = await supabase
    .from('eventos_agenda')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('professor_id', user.id)
    .select()
    .single()

  if (error) { console.error('updateEvento:', error); return { error: 'Erro ao atualizar evento.' } }
  return { data: row as EventoAgendaRow }
}

export async function updateAlunoScheduleAction(
  alunoId: string,
  oldDayKey: string,
  newDayKey: string,
  newHorario: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: aluno, error: fetchErr } = await supabase
    .from('alunos')
    .select('horarios')
    .eq('id', alunoId)
    .eq('professor_id', user.id)
    .single()

  if (fetchErr || !aluno) return { error: 'Aluno não encontrado.' }

  const horarios = (aluno.horarios as { dia: string; horario: string }[] ?? [])
    .filter(h => h.dia !== oldDayKey)

  // Add the new day/time (or update if newDayKey already exists)
  const existing = horarios.find(h => h.dia === newDayKey)
  if (existing) {
    existing.horario = newHorario
  } else {
    horarios.push({ dia: newDayKey, horario: newHorario })
  }

  const { error } = await supabase
    .from('alunos')
    .update({ horarios })
    .eq('id', alunoId)
    .eq('professor_id', user.id)

  if (error) { console.error('updateAlunoSchedule:', error); return { error: 'Erro ao atualizar agenda.' } }
  return {}
}

export async function deleteEventoAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Fetch the event first to check if it's linked to a pacote (so we can refund)
  const { data: evt } = await supabase
    .from('eventos_agenda')
    .select('pacote_id')
    .eq('id', id)
    .eq('professor_id', user.id)
    .single()

  const { error } = await supabase
    .from('eventos_agenda')
    .delete()
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) { console.error('deleteEvento:', error); return { error: 'Erro ao remover evento.' } }

  // Return aula to pacote
  if (evt?.pacote_id) {
    const { data: p } = await supabase
      .from('pacotes')
      .select('quantidade_usada')
      .eq('id', evt.pacote_id)
      .eq('professor_id', user.id)
      .single()
    if (p) {
      const novaUsada = Math.max(0, (p.quantidade_usada ?? 0) - 1)
      await supabase
        .from('pacotes')
        .update({ quantidade_usada: novaUsada, status: 'ativo', updated_at: new Date().toISOString() })
        .eq('id', evt.pacote_id)
        .eq('professor_id', user.id)
    }
  }

  return {}
}

/**
 * Creates multiple events sharing the same `serie_id` (a recurrence series).
 * Used for "Outros" events that repeat on selected weekdays.
 * Returns all inserted rows.
 */
export async function createEventoSerieAction(
  events: CreateInput[]
): Promise<{ data?: EventoAgendaRow[]; serieId?: string; error?: string }> {
  if (!events.length) return { error: 'Nenhum evento para criar.' }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const serieId = randomUUID()

  const rows = events.map(e => ({
    professor_id: user.id,
    ...e,
    serie_id: serieId,
  }))

  const { data, error } = await supabase
    .from('eventos_agenda')
    .insert(rows)
    .select()

  if (error) {
    console.error('createEventoSerie:', error.code, error.message, error.details, error.hint)
    return { error: `Erro ao criar série: ${error.message ?? error.code}` }
  }
  return { data: data as EventoAgendaRow[], serieId }
}

/**
 * Deletes all events in a recurrence series.
 */
export async function deleteEventoSerieAction(
  serieId: string
): Promise<{ deletedIds?: string[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('eventos_agenda')
    .delete()
    .eq('serie_id', serieId)
    .eq('professor_id', user.id)
    .select('id')

  if (error) { console.error('deleteEventoSerie:', error); return { error: 'Erro ao remover série.' } }
  return { deletedIds: (data ?? []).map(r => r.id as string) }
}
