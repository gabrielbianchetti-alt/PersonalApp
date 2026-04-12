'use server'

import { createClient } from '@/lib/supabase/server'
import type { SuspensaoTipo, AcaoHorario, SuspensaoRow, Conflitante } from './types'

export type { SuspensaoTipo, SuspensaoStatus, AcaoHorario, SuspensaoRow, AlunoSuspenso, Conflitante } from './types'

// ─── fetch ────────────────────────────────────────────────────────────────────

export async function getSuspensoesAction(): Promise<{ data?: SuspensaoRow[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('suspensoes')
    .select('*, alunos(nome, horarios)')
    .eq('professor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) { console.error('getSuspensoes:', error); return { error: `Erro ao buscar suspensões: ${error.message} (código: ${error.code})` } }

  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const al = r.alunos as { nome: string; horarios: { dia: string; horario: string }[] } | null
    const { alunos: _alunos, ...rest } = r
    void _alunos
    return {
      ...rest,
      aluno_nome:     al?.nome ?? '—',
      aluno_horarios: al?.horarios ?? [],
    }
  }) as unknown as SuspensaoRow[]

  return { data: rows }
}

// ─── criar suspensão ──────────────────────────────────────────────────────────

export async function criarSuspensaoAction(input: {
  aluno_id: string
  tipo: SuspensaoTipo
  data_inicio: string
  data_retorno?: string | null
  motivo?: string | null
  acao_horario: AcaoHorario
}): Promise<{ data?: SuspensaoRow; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Insert suspension
  const { data: row, error: insertError } = await supabase
    .from('suspensoes')
    .insert({
      professor_id: user.id,
      aluno_id:     input.aluno_id,
      tipo:         input.tipo,
      data_inicio:  input.data_inicio,
      data_retorno: input.data_retorno ?? null,
      motivo:       input.motivo ?? null,
      acao_horario: input.acao_horario,
      status:       'ativa',
    })
    .select()
    .single()

  if (insertError) {
    console.error('criarSuspensao:', insertError)
    return { error: `Erro ao criar suspensão: ${insertError.message} (código: ${insertError.code})` }
  }

  // Update aluno status to 'pausado'
  const { error: statusError } = await supabase
    .from('alunos')
    .update({ status: 'pausado' })
    .eq('id', input.aluno_id)
    .eq('professor_id', user.id)

  if (statusError) { console.error('updateAlunoPausado:', statusError); return { error: 'Suspensão criada, mas falha ao pausar aluno.' } }

  return { data: row as SuspensaoRow }
}

// ─── verificar conflitos ──────────────────────────────────────────────────────

export async function checkConflitosAction(
  alunoId: string
): Promise<{ conflitantes: Conflitante[]; aluno?: { nome: string; horarios: { dia: string; horario: string }[] }; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { conflitantes: [], error: 'Sessão expirada.' }

  // Get suspended aluno's schedule
  const { data: aluno, error: alunoError } = await supabase
    .from('alunos')
    .select('nome, horarios')
    .eq('id', alunoId)
    .eq('professor_id', user.id)
    .single()

  if (alunoError || !aluno) return { conflitantes: [], error: 'Aluno não encontrado.' }

  // Get all active alunos
  const { data: ativos, error: ativosError } = await supabase
    .from('alunos')
    .select('id, nome, horarios')
    .eq('professor_id', user.id)
    .eq('status', 'ativo')
    .neq('id', alunoId)

  if (ativosError) return { conflitantes: [], error: 'Erro ao verificar conflitos.' }

  // Check for overlapping horarios in JS
  const alunoHorarios = aluno.horarios as { dia: string; horario: string }[]
  const conflitantes: Conflitante[] = (ativos ?? [])
    .filter(a => {
      const aHorarios = a.horarios as { dia: string; horario: string }[]
      return alunoHorarios.some(ah =>
        aHorarios.some(bh => bh.dia === ah.dia && bh.horario === ah.horario)
      )
    })
    .map(a => ({
      id:      a.id,
      nome:    a.nome,
      horarios: a.horarios as { dia: string; horario: string }[],
    }))

  return { conflitantes, aluno }
}

// ─── reativar aluno ───────────────────────────────────────────────────────────

export async function reativarAlunoAction(
  suspensaoId: string,
  alunoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Mark suspension as encerrada
  const { error: suspError } = await supabase
    .from('suspensoes')
    .update({ status: 'encerrada' })
    .eq('id', suspensaoId)
    .eq('professor_id', user.id)

  if (suspError) {
    console.error('encerrarSuspensao:', suspError)
    return { error: `Erro ao encerrar suspensão: ${suspError.message}` }
  }

  // Update aluno status to 'ativo'
  const { error: alunoError } = await supabase
    .from('alunos')
    .update({ status: 'ativo' })
    .eq('id', alunoId)
    .eq('professor_id', user.id)

  if (alunoError) { console.error('reativarAluno:', alunoError); return { error: 'Suspensão encerrada, mas falha ao reativar aluno.' } }

  return {}
}

// ─── encerrar manualmente (sem reativar aluno) ────────────────────────────────

export async function encerrarSuspensaoAction(
  suspensaoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('suspensoes')
    .update({ status: 'encerrada' })
    .eq('id', suspensaoId)
    .eq('professor_id', user.id)

  if (error) {
    console.error('encerrarSuspensao:', error)
    return { error: `Erro ao encerrar suspensão: ${error.message}` }
  }
  return {}
}
