'use server'

import { createClient } from '@/lib/supabase/server'

export type EventoTipo = 'aula' | 'reposicao' | 'reuniao' | 'bloqueado' | 'refeicao' | 'outro'

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
}

export async function createEventoAction(
  data: CreateInput
): Promise<{ data?: EventoAgendaRow; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: row, error } = await supabase
    .from('eventos_agenda')
    .insert({ professor_id: user.id, ...data })
    .select()
    .single()

  if (error) { console.error('createEvento:', error); return { error: 'Erro ao criar evento.' } }
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
    .select('dias_semana')
    .eq('id', alunoId)
    .eq('professor_id', user.id)
    .single()

  if (fetchErr || !aluno) return { error: 'Aluno não encontrado.' }

  const dias = (aluno.dias_semana as string[]).filter((d) => d !== oldDayKey)
  if (!dias.includes(newDayKey)) dias.push(newDayKey)

  const { error } = await supabase
    .from('alunos')
    .update({ dias_semana: dias, horario_inicio: newHorario })
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

  const { error } = await supabase
    .from('eventos_agenda')
    .delete()
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) { console.error('deleteEvento:', error); return { error: 'Erro ao remover evento.' } }
  return {}
}
