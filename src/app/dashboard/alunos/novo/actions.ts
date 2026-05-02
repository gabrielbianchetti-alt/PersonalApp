'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { AlunoFormData, addDays } from '@/types/aluno'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

export async function criarAlunoAction(
  data: AlunoFormData
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada. Faça login novamente.' }

  const isPacote = data.modelo_cobranca === 'pacote'

  const basePayload = {
    professor_id: user.id,

    nome: data.nome.trim(),
    whatsapp: data.whatsapp.replace(/\D/g, ''),
    data_nascimento: data.data_nascimento || null,
    data_inicio: data.data_inicio,
    emergencia_nome: data.emergencia_nome.trim() || null,
    emergencia_telefone: data.emergencia_telefone.replace(/\D/g, '') || null,
    emergencia_parentesco: data.emergencia_parentesco.trim() || null,

    // Pacote não usa horários fixos
    horarios: isPacote ? [] : data.horarios,
    duracao: parseInt(data.duracao),
    local: data.local || null,
    endereco: data.endereco.trim() || null,
    modelo_cobranca: data.modelo_cobranca,
    valor: parseFloat(data.valor),
    dia_cobranca: parseInt(data.dia_cobranca) || 1,

    objetivos: data.objetivos,
    restricoes: data.restricoes.trim() || null,
    observacoes: data.observacoes.trim() || null,
  }

  let { data: row, error } = await supabase
    .from('alunos')
    .insert(basePayload)
    .select()
    .single()

  // Fallback: banco antigo com `forma_pagamento` NOT NULL (coluna foi
  // centralizada em preferencias_cobranca.forma_pagamento_padrao). Reinsere
  // com 'pix' como default até a migration de drop NOT NULL ser aplicada.
  if (error && isLegacyFormaPagamentoNotNull(error)) {
    const retry = await supabase
      .from('alunos')
      .insert({ ...basePayload, forma_pagamento: 'pix' })
      .select()
      .single()
    row = retry.data
    error = retry.error
  }

  if (error) {
    console.error('criarAluno insert error:', {
      code: error.code, message: error.message, details: error.details, hint: error.hint,
    })
    return { error: formatSupabaseError(error, 'Erro ao salvar aluno') }
  }

  // Cria o primeiro pacote para alunos tipo pacote
  if (isPacote && row) {
    const qtd        = parseInt(data.pacote_quantidade) || 0
    const validade   = parseInt(data.pacote_validade_dias) || 30
    const vencimento = addDays(data.pacote_data_inicio, validade)
    const tipoPacote = data.pacote_tipo ?? 'alternado'
    const alunoId    = (row as { id: string }).id

    const { data: pacoteRow, error: pacoteErr } = await supabase.from('pacotes').insert({
      professor_id:     user.id,
      aluno_id:         alunoId,
      quantidade_total: qtd,
      quantidade_usada: 0,
      valor:            parseFloat(data.valor),
      validade_dias:    validade,
      data_inicio:      data.pacote_data_inicio,
      data_vencimento:  vencimento,
      data_cobranca:    data.pacote_data_cobranca,
      status:           'ativo',
      tipo_pacote:      tipoPacote,
    }).select().single()
    if (pacoteErr) console.error('Erro ao criar pacote inicial:', pacoteErr)

    // Se for pacote FIXO, gera os eventos na agenda automaticamente
    if (tipoPacote === 'fixo' && pacoteRow && qtd > 0 && data.horarios.length > 0) {
      const eventos = gerarEventosPacoteFixo({
        professorId: user.id,
        alunoId,
        alunoNome:   data.nome.trim(),
        pacoteId:    (pacoteRow as { id: string }).id,
        horarios:    data.horarios,
        duracao:     parseInt(data.duracao) || 60,
        quantidade:  qtd,
        dataInicio:  data.pacote_data_inicio,
        dataVencimento: vencimento,
      })
      if (eventos.length > 0) {
        const { error: evtErr } = await supabase.from('eventos_agenda').insert(eventos)
        if (evtErr) console.error('Erro ao gerar eventos do pacote fixo:', evtErr)
      }
    }
  }

  revalidatePath('/dashboard/alunos')
  revalidatePath('/dashboard/pacotes')
  revalidatePath('/dashboard/agenda')
  return { data: row as Record<string, unknown> }
}

// ─── Helpers: erros do Supabase ──────────────────────────────────────────────

type PgError = { code?: string | null; message?: string | null; details?: string | null; hint?: string | null }

function isLegacyFormaPagamentoNotNull(err: PgError): boolean {
  // 23502 = not_null_violation. Pode vir em `message` ou `details`.
  if (err.code !== '23502') return false
  const blob = `${err.message ?? ''} ${err.details ?? ''}`
  return blob.includes('forma_pagamento')
}

function formatSupabaseError(err: PgError, prefix: string): string {
  const parts: string[] = []
  if (err.message) parts.push(err.message)
  if (err.details) parts.push(err.details)
  if (err.hint)    parts.push(`Dica: ${err.hint}`)
  if (parts.length === 0) return `${prefix}. Tente novamente.`
  return `${prefix}: ${parts.join(' — ')}`
}

// ─── Helper: gera eventos para um pacote fixo ─────────────────────────────────
//
// Itera dia-a-dia a partir de `dataInicio`, e para cada dia que bate com algum
// horário do aluno cria um evento `tipo='aula'` linkado ao `pacote_id`. Para
// até completar `quantidade` aulas OU atingir `dataVencimento`.

const DOW_TO_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

function gerarEventosPacoteFixo(params: {
  professorId:    string
  alunoId:        string
  alunoNome:      string
  pacoteId:       string
  horarios:       { dia: string; horario: string }[]
  duracao:        number
  quantidade:     number
  dataInicio:     string
  dataVencimento: string
}) {
  const eventos: Record<string, unknown>[] = []
  const horarioMap: Record<string, string> = {}
  for (const h of params.horarios) horarioMap[h.dia] = h.horario

  const start = new Date(params.dataInicio + 'T12:00:00')
  const end   = new Date(params.dataVencimento + 'T23:59:59')

  for (let d = new Date(start); d <= end && eventos.length < params.quantidade; d.setDate(d.getDate() + 1)) {
    const dayKey = DOW_TO_KEY[d.getDay()]
    const horario = horarioMap[dayKey]
    if (!horario) continue
    const dataIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    eventos.push({
      professor_id:    params.professorId,
      tipo:            'aula',
      titulo:          `Aula — ${params.alunoNome.split(' ')[0]}`,
      aluno_id:        params.alunoId,
      dia_semana:      null,
      data_especifica: dataIso,
      horario_inicio:  horario,
      duracao:         params.duracao,
      cor:             null,
      observacao:      null,
      valor:           null,
      pacote_id:       params.pacoteId,
    })
  }

  return eventos
}
