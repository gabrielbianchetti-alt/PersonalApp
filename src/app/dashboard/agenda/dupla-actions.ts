'use server'

/**
 * Aulas em Dupla — server actions específicas da AGENDA.
 * Mantidas separadas de actions.ts para preservar 100% do contrato existente.
 */

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'
import { dividirValorDupla, valorEventoDupla } from '@/lib/utils/aulas-em-dupla'
import type { ModeloCobranca } from '@/types/aluno'
import { createEventoAction, deleteEventoAction, type EventoAgendaRow, type EventoTipo } from './actions'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type CreateAulaInput = {
  tipo: 'aula' | 'reposicao'
  titulo: string
  aluno_id: string
  dia_semana?: string | null
  data_especifica?: string | null
  horario_inicio: string
  duracao: number
  cor?: string | null
  observacao?: string | null
  pacote_id?: string | null
}

const DOW_TO_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

function diaSemanaDe(input: { dia_semana?: string | null; data_especifica?: string | null }): string | null {
  if (input.dia_semana) return input.dia_semana
  if (input.data_especifica) {
    const d = new Date(input.data_especifica + 'T12:00:00')
    return DOW_TO_KEY[d.getDay()]
  }
  return null
}

interface AlunoDuplaInfo {
  id: string
  nome: string
  parceiro_id: string | null
  frequencia_dupla: 'sempre' | 'dias_especificos' | 'esporadico' | null
  dias_dupla: string[] | null
  modelo_cobranca: ModeloCobranca | null
}

async function loadAlunoDupla(
  supabase: SupabaseClient,
  professorId: string,
  alunoId: string,
): Promise<AlunoDuplaInfo | null> {
  const { data, error } = await supabase
    .from('alunos')
    .select('id, nome, parceiro_id, frequencia_dupla, dias_dupla, modelo_cobranca')
    .eq('id', alunoId)
    .eq('professor_id', professorId)
    .maybeSingle()
  if (error) {
    console.warn('[dupla] loadAlunoDupla erro:', error.code, error.message)
    return null
  }
  if (!data) {
    console.warn('[dupla] loadAlunoDupla: aluno não encontrado', { alunoId, professorId })
    return null
  }
  return data as AlunoDuplaInfo
}

/**
 * Decide se uma aula DEVE ser criada em dupla automaticamente, com base na
 * configuração do aluno (frequencia_dupla) e no dia da semana do evento.
 *
 * - 'sempre'           → sempre dupla
 * - 'dias_especificos' → dupla se o dia bate com dias_dupla
 * - 'esporadico'       → nunca cria automaticamente (professor decide caso a caso)
 * - null/undefined     → sem dupla
 */
function deveCriarEmDupla(
  aluno: AlunoDuplaInfo,
  evento: { dia_semana?: string | null; data_especifica?: string | null },
): boolean {
  if (!aluno.parceiro_id) return false
  const freq = aluno.frequencia_dupla
  if (!freq) return false
  if (freq === 'sempre') return true
  if (freq === 'esporadico') return false
  if (freq === 'dias_especificos') {
    const dia = diaSemanaDe(evento)
    if (!dia) return false
    return (aluno.dias_dupla ?? []).includes(dia)
  }
  return false
}

/**
 * Cria uma aula que pode ser individual OU em dupla, dependendo da configuração
 * do aluno principal. Se for dupla, cria 2 rows em eventos_agenda linkadas.
 *
 * Em caso de falha na 2ª inserção, faz cleanup da 1ª (rollback).
 */
export async function createAulaSmartAction(
  input: CreateAulaInput,
): Promise<{ data?: EventoAgendaRow; parceiroEvento?: EventoAgendaRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const aluno = await loadAlunoDupla(supabase, user.id, input.aluno_id)
  // Aluno não encontrado ou colunas de dupla não existem ainda (pre-migration):
  // cai para criação individual normal.
  if (!aluno || !deveCriarEmDupla(aluno, input)) {
    return createEventoAction(input)
  }

  // Cria primeiro evento (aluno principal)
  const r1 = await createEventoAction({ ...input, eh_dupla: true })
  if (r1.error || !r1.data) return r1

  // Cria evento espelhado (parceiro) com o mesmo horário/data
  const parceiroAluno = await loadAlunoDupla(supabase, user.id, aluno.parceiro_id!)
  const tituloParceiro = parceiroAluno
    ? `${input.tipo === 'reposicao' ? 'Reposição' : 'Aula'} — ${parceiroAluno.nome.split(' ')[0]}`
    : input.titulo

  const r2 = await createEventoAction({
    tipo:            input.tipo,
    titulo:          tituloParceiro,
    aluno_id:        aluno.parceiro_id!,
    dia_semana:      input.dia_semana ?? null,
    data_especifica: input.data_especifica ?? null,
    horario_inicio:  input.horario_inicio,
    duracao:         input.duracao,
    cor:             input.cor ?? null,
    observacao:      input.observacao ?? null,
    eh_dupla:        true,
    parceiro_evento_id: r1.data.id,
  })

  if (r2.error || !r2.data) {
    // Cleanup do primeiro
    await deleteEventoAction(r1.data.id).catch(() => {})
    return { error: r2.error ?? 'Erro ao criar evento parceiro.' }
  }

  // Linka o primeiro ao segundo (post-update)
  await supabase
    .from('eventos_agenda')
    .update({ parceiro_evento_id: r2.data.id })
    .eq('id', r1.data.id)
    .eq('professor_id', user.id)

  return { data: { ...r1.data, parceiro_evento_id: r2.data.id, eh_dupla: true }, parceiroEvento: r2.data }
}

/**
 * Cria um par linkado de eventos eh_dupla=true para uma única ocorrência (data
 * específica OU dia da semana recorrente). Usa o nome de cada aluno no título
 * e propaga `serieId` quando vier (criação em série). Pacote do `valor` é
 * decidido pelo caller via `valorA`/`valorB` (null = não cobra à parte).
 *
 * Em caso de falha na 2ª inserção, deleta a 1ª e retorna o erro.
 */
async function criarParDupla(
  supabase: SupabaseClient,
  professorId: string,
  alunoA: AlunoDuplaInfo,
  alunoB: AlunoDuplaInfo,
  data:    { data_especifica?: string; dia_semana?: string },
  base:    { horario_inicio: string; duracao: number; valorA: number | null; valorB: number | null; serieId?: string },
): Promise<{ eventoA?: EventoAgendaRow; eventoB?: EventoAgendaRow; error?: string }> {
  const dateFields = {
    data_especifica: data.data_especifica ?? null,
    dia_semana:      data.dia_semana ?? null,
  }
  const r1 = await createEventoAction({
    tipo:           'aula',
    titulo:         `Aula em dupla — ${alunoA.nome.split(' ')[0]}`,
    aluno_id:       alunoA.id,
    horario_inicio: base.horario_inicio,
    duracao:        base.duracao,
    valor:          base.valorA,
    eh_dupla:       true,
    serie_id:       base.serieId,
    ...dateFields,
  })
  if (r1.error || !r1.data) return { error: r1.error ?? 'Erro ao criar evento do aluno A.' }

  const r2 = await createEventoAction({
    tipo:               'aula',
    titulo:             `Aula em dupla — ${alunoB.nome.split(' ')[0]}`,
    aluno_id:           alunoB.id,
    horario_inicio:     base.horario_inicio,
    duracao:            base.duracao,
    valor:              base.valorB,
    eh_dupla:           true,
    parceiro_evento_id: r1.data.id,
    serie_id:           base.serieId,
    ...dateFields,
  })
  if (r2.error || !r2.data) {
    await deleteEventoAction(r1.data.id).catch(() => {})
    return { error: r2.error ?? 'Erro ao criar evento do aluno B.' }
  }

  await supabase
    .from('eventos_agenda')
    .update({ parceiro_evento_id: r2.data.id })
    .eq('id', r1.data.id)
    .eq('professor_id', professorId)

  return {
    eventoA: { ...r1.data, eh_dupla: true, parceiro_evento_id: r2.data.id },
    eventoB: r2.data,
  }
}

/**
 * Aulas em Dupla — criação MANUAL pontual (data específica) entre dois alunos
 * quaisquer, independente do `parceiro_id` / `frequencia_dupla` no perfil.
 * `valor_total` é dividido por 2 e somado na cobrança do mês de referência.
 */
export async function createAulaDuplaManualAction(input: {
  aluno_a_id:      string
  aluno_b_id:      string
  data_especifica: string
  horario_inicio:  string
  duracao:         number
  valor_total:     number
}): Promise<{ eventoA?: EventoAgendaRow; eventoB?: EventoAgendaRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  if (input.aluno_a_id === input.aluno_b_id) return { error: 'Selecione dois alunos diferentes.' }
  if (!(input.valor_total > 0)) return { error: 'Informe o valor da aula em dupla.' }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const [alunoA, alunoB] = await Promise.all([
    loadAlunoDupla(supabase, user.id, input.aluno_a_id),
    loadAlunoDupla(supabase, user.id, input.aluno_b_id),
  ])
  if (!alunoA || !alunoB) return { error: 'Aluno não encontrado.' }

  const valorMetade = dividirValorDupla(input.valor_total)
  return criarParDupla(supabase, user.id, alunoA, alunoB,
    { data_especifica: input.data_especifica },
    {
      horario_inicio: input.horario_inicio,
      duracao:        input.duracao,
      valorA:         valorEventoDupla(alunoA.modelo_cobranca ?? 'mensalidade', valorMetade),
      valorB:         valorEventoDupla(alunoB.modelo_cobranca ?? 'mensalidade', valorMetade),
    },
  )
}

/**
 * Aulas em Dupla — criação MANUAL recorrente. Para cada dia da semana, cria
 * um par linkado com mesmo `serie_id` (permite delete em série). Pares são
 * criados sequencialmente porque createEventoAction valida o saldo do pacote
 * a cada inserção. Cleanup best-effort em caso de falha.
 */
export async function createAulaDuplaSerieAction(input: {
  aluno_a_id:      string
  aluno_b_id:      string
  dias_semana:     string[]
  horario_inicio:  string
  duracao:         number
  valor_total:     number
}): Promise<{ eventos?: EventoAgendaRow[]; serieId?: string; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  if (input.aluno_a_id === input.aluno_b_id) return { error: 'Selecione dois alunos diferentes.' }
  if (!(input.valor_total > 0)) return { error: 'Informe o valor da aula em dupla.' }
  if (!input.dias_semana.length) return { error: 'Selecione pelo menos um dia da semana.' }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const [alunoA, alunoB] = await Promise.all([
    loadAlunoDupla(supabase, user.id, input.aluno_a_id),
    loadAlunoDupla(supabase, user.id, input.aluno_b_id),
  ])
  if (!alunoA || !alunoB) return { error: 'Aluno não encontrado.' }

  const valorMetade = dividirValorDupla(input.valor_total)
  const valorA = valorEventoDupla(alunoA.modelo_cobranca ?? 'mensalidade', valorMetade)
  const valorB = valorEventoDupla(alunoB.modelo_cobranca ?? 'mensalidade', valorMetade)
  const serieId = randomUUID()
  const created: EventoAgendaRow[] = []

  for (const dia of input.dias_semana) {
    const r = await criarParDupla(supabase, user.id, alunoA, alunoB,
      { dia_semana: dia },
      { horario_inicio: input.horario_inicio, duracao: input.duracao, valorA, valorB, serieId },
    )
    if (r.error || !r.eventoA || !r.eventoB) {
      for (const ev of created) await deleteEventoAction(ev.id).catch(() => {})
      return { error: r.error ?? 'Erro ao criar evento da série.' }
    }
    created.push(r.eventoA, r.eventoB)
  }

  return { eventos: created, serieId }
}

/**
 * Transforma uma aula existente individual em uma aula em dupla, criando o
 * evento parceiro espelhado para o aluno escolhido.
 */
export async function transformarAulaEmDuplaAction(
  eventoId: string,
  parceiroAlunoId: string,
): Promise<{ parceiroEvento?: EventoAgendaRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Carrega o evento original
  const { data: orig } = await supabase
    .from('eventos_agenda')
    .select('*')
    .eq('id', eventoId)
    .eq('professor_id', user.id)
    .maybeSingle()
  if (!orig) return { error: 'Evento não encontrado.' }
  const original = orig as EventoAgendaRow
  if (original.tipo !== 'aula' && original.tipo !== 'reposicao') {
    return { error: 'Apenas aulas e reposições podem virar dupla.' }
  }
  if (original.eh_dupla) return { error: 'Esta aula já é em dupla.' }

  // Carrega o parceiro escolhido
  const parceiroAluno = await loadAlunoDupla(supabase, user.id, parceiroAlunoId)
  if (!parceiroAluno) return { error: 'Aluno parceiro não encontrado.' }
  const tituloParceiro = `${original.tipo === 'reposicao' ? 'Reposição' : 'Aula'} — ${parceiroAluno.nome.split(' ')[0]}`

  // Cria evento espelhado
  const r = await createEventoAction({
    tipo:            original.tipo as EventoTipo,
    titulo:          tituloParceiro,
    aluno_id:        parceiroAlunoId,
    dia_semana:      original.dia_semana,
    data_especifica: original.data_especifica,
    horario_inicio:  original.horario_inicio,
    duracao:         original.duracao,
    cor:             original.cor,
    observacao:      original.observacao,
    eh_dupla:        true,
    parceiro_evento_id: original.id,
  })
  if (r.error || !r.data) return { error: r.error ?? 'Erro ao criar evento parceiro.' }

  // Linka o original ao novo
  await supabase
    .from('eventos_agenda')
    .update({ eh_dupla: true, parceiro_evento_id: r.data.id })
    .eq('id', original.id)
    .eq('professor_id', user.id)

  return { parceiroEvento: r.data }
}

/**
 * Transforma uma aula em dupla em individual: deleta o evento do aluno X
 * (escolhido para sair) e desliga eh_dupla/parceiro_evento_id do que fica.
 */
export async function transformarDuplaEmIndividualAction(
  eventoQueFicaId: string,
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Carrega o evento que fica
  const { data: ficaRow } = await supabase
    .from('eventos_agenda')
    .select('id, parceiro_evento_id, eh_dupla')
    .eq('id', eventoQueFicaId)
    .eq('professor_id', user.id)
    .maybeSingle()
  if (!ficaRow) return { error: 'Evento não encontrado.' }
  const fica = ficaRow as { id: string; parceiro_evento_id: string | null; eh_dupla: boolean | null }
  if (!fica.eh_dupla || !fica.parceiro_evento_id) {
    // Já é individual — no-op
    return {}
  }

  // Deleta o evento do parceiro (devolve aula a pacote se aplicável)
  const del = await deleteEventoAction(fica.parceiro_evento_id)
  if (del.error) return { error: del.error }

  // Desliga as flags do que fica
  const { error: updErr } = await supabase
    .from('eventos_agenda')
    .update({ eh_dupla: false, parceiro_evento_id: null })
    .eq('id', fica.id)
    .eq('professor_id', user.id)
  if (updErr) {
    console.error('transformarDuplaEmIndividual update:', updErr)
    return { error: 'Erro ao desligar dupla do evento que fica.' }
  }
  return {}
}
