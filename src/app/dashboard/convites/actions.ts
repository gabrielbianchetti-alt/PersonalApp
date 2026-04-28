'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'
import { addDays } from '@/types/aluno'

export type ConviteStatus = 'pendente' | 'aguardando_aprovacao' | 'aprovado' | 'recusado' | 'expirado' | 'cancelado'

export interface ConviteRow {
  id:              string
  professor_id:    string
  modelo_cobranca: 'por_aula' | 'mensalidade' | 'pacote'
  horarios:        { dia: string; horario: string }[]
  duracao:         number
  local:           string
  endereco:        string | null
  valor:           number
  forma_pagamento: 'pix' | 'cartao'
  dia_cobranca:    number
  dados_pacote:    {
    quantidade_total: number
    validade_dias:    number
    data_inicio:      string
    data_cobranca:    string
    tipo_pacote?:     'fixo' | 'alternado'
  } | null
  link_token:       string
  status:           ConviteStatus
  aluno_id:         string | null
  data_criacao:     string
  data_expiracao:   string
  data_preenchido:  string | null
  data_aprovado:    string | null
  created_at:       string
  updated_at:       string
}

/** Row com dados do aluno preenchido (pra seção "Aguardando aprovação") */
export interface ConvitePendenteComAluno extends ConviteRow {
  aluno: {
    nome:  string
    whatsapp: string | null
    data_nascimento: string | null
    emergencia_nome: string | null
    emergencia_telefone: string | null
    emergencia_parentesco: string | null
    objetivos: string[] | null
    restricoes: string | null
    observacoes: string | null
  } | null
}

// ─── Professor: criar convite ─────────────────────────────────────────────────

export interface CreateConviteInput {
  modelo_cobranca: 'por_aula' | 'mensalidade' | 'pacote'
  horarios:        { dia: string; horario: string }[]
  duracao:         number
  local:           string
  endereco?:       string | null
  valor:           number
  forma_pagamento?: 'pix' | 'cartao'
  dia_cobranca?:   number
  dados_pacote?: {
    quantidade_total: number
    validade_dias:    number
    data_inicio:      string
    data_cobranca:    string
    tipo_pacote?:     'fixo' | 'alternado'
  } | null
}

export async function createConviteAction(
  input: CreateConviteInput
): Promise<{ data?: ConviteRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('convites_aluno')
    .insert({
      professor_id:    user.id,
      modelo_cobranca: input.modelo_cobranca,
      horarios:        input.horarios,
      duracao:         input.duracao,
      local:           input.local,
      endereco:        input.endereco ?? null,
      valor:           input.valor,
      forma_pagamento: input.forma_pagamento ?? 'pix',
      dia_cobranca:    input.dia_cobranca ?? 1,
      dados_pacote:    input.dados_pacote ?? null,
      status:          'pendente',
    })
    .select()
    .single()

  if (error) { console.error('createConvite:', error); return { error: error.message } }
  revalidatePath('/dashboard/alunos')
  return { data: data as ConviteRow }
}

// ─── Professor: listar convites ───────────────────────────────────────────────

export async function listConvitesAction(): Promise<{ data?: ConviteRow[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('convites_aluno')
    .select('*')
    .eq('professor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) { console.error('listConvites:', error); return { error: error.message } }

  // Auto-marca expirados sem fazer UPDATE (a RPC de preencher também marca)
  const now = new Date().toISOString()
  const rows = (data ?? []) as ConviteRow[]
  for (const r of rows) {
    if (r.status === 'pendente' && r.data_expiracao < now) r.status = 'expirado'
  }
  return { data: rows }
}

/** Convites aguardando aprovação com dados do aluno preenchido */
export async function listConvitesAprovacaoAction(): Promise<{
  data?: ConvitePendenteComAluno[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('convites_aluno')
    .select('*, aluno:aluno_id(nome, whatsapp, data_nascimento, emergencia_nome, emergencia_telefone, emergencia_parentesco, objetivos, restricoes, observacoes)')
    .eq('professor_id', user.id)
    .eq('status', 'aguardando_aprovacao')
    .order('data_preenchido', { ascending: false })

  if (error) { console.error('listConvitesAprovacao:', error); return { error: error.message } }

  return { data: (data ?? []) as ConvitePendenteComAluno[] }
}

// ─── Professor: aprovar / recusar / cancelar ──────────────────────────────────

export async function aprovarConviteAction(
  conviteId: string
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Busca o convite
  const { data: c } = await supabase
    .from('convites_aluno')
    .select('aluno_id, status, modelo_cobranca, dados_pacote, valor')
    .eq('id', conviteId)
    .eq('professor_id', user.id)
    .single()

  if (!c)                                     return { error: 'Convite não encontrado.' }
  if (c.status !== 'aguardando_aprovacao')    return { error: 'Convite não está aguardando aprovação.' }
  if (!c.aluno_id)                            return { error: 'Convite sem aluno preenchido.' }

  // Ativa o aluno
  const { error: upAlunoErr } = await supabase
    .from('alunos')
    .update({ status: 'ativo' })
    .eq('id', c.aluno_id)
    .eq('professor_id', user.id)
  if (upAlunoErr) { console.error('aprovarConvite alunos:', upAlunoErr); return { error: upAlunoErr.message } }

  // Marca convite como aprovado
  const { error: upConvErr } = await supabase
    .from('convites_aluno')
    .update({ status: 'aprovado', data_aprovado: new Date().toISOString() })
    .eq('id', conviteId)
    .eq('professor_id', user.id)
  if (upConvErr) { console.error('aprovarConvite convite:', upConvErr); return { error: upConvErr.message } }

  // Se for pacote, cria o registro do pacote (e eventos se for fixo)
  if (c.modelo_cobranca === 'pacote' && c.dados_pacote) {
    const p = c.dados_pacote as {
      quantidade_total: number; validade_dias: number
      data_inicio: string; data_cobranca: string
      tipo_pacote?: 'fixo' | 'alternado'
    }
    const vencimento = addDays(p.data_inicio, p.validade_dias)
    const tipoPacote = p.tipo_pacote ?? 'alternado'

    const { data: pacoteRow, error: pacoteErr } = await supabase.from('pacotes').insert({
      professor_id:     user.id,
      aluno_id:         c.aluno_id,
      quantidade_total: p.quantidade_total,
      quantidade_usada: 0,
      valor:            Number(c.valor),
      validade_dias:    p.validade_dias,
      data_inicio:      p.data_inicio,
      data_vencimento:  vencimento,
      data_cobranca:    p.data_cobranca,
      status:           'ativo',
      tipo_pacote:      tipoPacote,
    }).select().single()
    if (pacoteErr) console.error('aprovarConvite pacote:', pacoteErr)

    // Pacote fixo: gera eventos a partir dos horários do convite
    if (tipoPacote === 'fixo' && pacoteRow && c.aluno_id) {
      // Busca horários e dados do convite + aluno
      const { data: convFull } = await supabase
        .from('convites_aluno')
        .select('horarios, duracao')
        .eq('id', conviteId)
        .single()
      const { data: alunoRow } = await supabase
        .from('alunos')
        .select('nome')
        .eq('id', c.aluno_id)
        .single()

      const horarios = (convFull?.horarios ?? []) as { dia: string; horario: string }[]
      const duracao  = (convFull?.duracao ?? 60) as number
      if (horarios.length > 0) {
        const eventos = gerarEventosPacoteFixoConvite({
          professorId: user.id,
          alunoId:     c.aluno_id,
          alunoNome:   alunoRow?.nome ?? 'Aluno',
          pacoteId:    (pacoteRow as { id: string }).id,
          horarios, duracao,
          quantidade:  p.quantidade_total,
          dataInicio:  p.data_inicio,
          dataVencimento: vencimento,
        })
        if (eventos.length > 0) {
          const { error: evtErr } = await supabase.from('eventos_agenda').insert(eventos)
          if (evtErr) console.error('aprovarConvite eventos:', evtErr)
        }
      }
    }
  }

  revalidatePath('/dashboard/alunos')
  revalidatePath('/dashboard/agenda')
  return {}
}

export async function recusarConviteAction(
  conviteId: string
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Busca o convite para achar o aluno
  const { data: c } = await supabase
    .from('convites_aluno')
    .select('aluno_id')
    .eq('id', conviteId)
    .eq('professor_id', user.id)
    .single()

  if (!c) return { error: 'Convite não encontrado.' }

  // Deleta o aluno criado (se existir)
  if (c.aluno_id) {
    await supabase.from('alunos').delete().eq('id', c.aluno_id).eq('professor_id', user.id)
  }

  // Marca convite como recusado
  const { error } = await supabase
    .from('convites_aluno')
    .update({ status: 'recusado' })
    .eq('id', conviteId)
    .eq('professor_id', user.id)

  if (error) { console.error('recusarConvite:', error); return { error: error.message } }

  revalidatePath('/dashboard/alunos')
  return {}
}

export async function cancelarConviteAction(
  conviteId: string
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('convites_aluno')
    .update({ status: 'cancelado' })
    .eq('id', conviteId)
    .eq('professor_id', user.id)
    .eq('status', 'pendente')

  if (error) { console.error('cancelarConvite:', error); return { error: error.message } }
  revalidatePath('/dashboard/alunos')
  return {}
}

// ─── Público (sem auth): buscar convite + submeter dados ─────────────────────

export interface ConvitePublico {
  link_token:       string
  professor_nome:   string
  modelo_cobranca:  'por_aula' | 'mensalidade' | 'pacote'
  horarios:         { dia: string; horario: string }[]
  duracao:          number
  local:            string
  valor:            number
  dados_pacote:     {
    quantidade_total: number
    validade_dias:    number
  } | null
  status:           ConviteStatus
  data_expiracao:   string
}

/**
 * Busca convite público por token. Retorna apenas os dados que a página
 * pública precisa mostrar + o status pra renderizar "expirado" / "já usado".
 */
export async function getConvitePublicoAction(
  token: string
): Promise<{ data?: ConvitePublico; error?: string }> {
  const supabase = await createClient()

  const { data: c, error } = await supabase
    .from('convites_aluno')
    .select('link_token, professor_id, modelo_cobranca, horarios, duracao, local, valor, dados_pacote, status, data_expiracao')
    .eq('link_token', token)
    .maybeSingle()

  if (error) { console.error('getConvitePublico:', error); return { error: error.message } }
  if (!c)    return { error: 'Convite não encontrado.' }

  // Auto-marca expirado se já passou da data
  let status = c.status as ConviteStatus
  if (status === 'pendente' && new Date(c.data_expiracao) < new Date()) {
    status = 'expirado'
  }

  // Nome do professor — busca direto do perfil
  const { data: perfil } = await supabase
    .from('professor_perfil')
    .select('nome')
    .eq('professor_id', c.professor_id)
    .maybeSingle()

  const professor_nome = (perfil?.nome as string | null) ?? 'seu professor'

  return {
    data: {
      link_token:      c.link_token as string,
      professor_nome,
      modelo_cobranca: c.modelo_cobranca as ConvitePublico['modelo_cobranca'],
      horarios:        (c.horarios ?? []) as ConvitePublico['horarios'],
      duracao:         c.duracao as number,
      local:           c.local as string,
      valor:           Number(c.valor),
      dados_pacote:    c.dados_pacote
        ? {
            quantidade_total: (c.dados_pacote as { quantidade_total: number }).quantidade_total,
            validade_dias:    (c.dados_pacote as { validade_dias: number }).validade_dias,
          }
        : null,
      status,
      data_expiracao:  c.data_expiracao as string,
    },
  }
}

export interface SubmeterConviteInput {
  token:                 string
  nome:                  string
  whatsapp:              string
  data_nascimento:       string
  emergencia_nome?:      string
  emergencia_telefone?:  string
  emergencia_parentesco?: string
  objetivos?:            string[]
  restricoes?:           string
  observacoes?:          string
}

/**
 * Submissão pública do formulário do aluno. Chama a RPC `preencher_convite_aluno`
 * que faz toda a lógica em uma transação no banco (cria aluno + marca convite).
 */
export async function submeterConviteAction(
  input: SubmeterConviteInput
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('preencher_convite_aluno', {
    p_token:                 input.token,
    p_nome:                  input.nome.trim(),
    p_whatsapp:              input.whatsapp.replace(/\D/g, ''),
    p_data_nascimento:       input.data_nascimento,
    p_emergencia_nome:       (input.emergencia_nome      ?? '').trim(),
    p_emergencia_telefone:   (input.emergencia_telefone  ?? '').replace(/\D/g, ''),
    p_emergencia_parentesco: (input.emergencia_parentesco ?? '').trim(),
    p_objetivos:             input.objetivos ?? [],
    p_restricoes:             input.restricoes ?? '',
    p_observacoes:            input.observacoes ?? '',
  })

  if (error) {
    console.error('submeterConvite:', error)
    // Erros explícitos da RPC
    if (error.message.includes('expirado')) return { error: 'Este convite expirou.' }
    if (error.message.includes('utilizado') || error.message.includes('indispon'))
      return { error: 'Este convite já foi utilizado.' }
    return { error: 'Erro ao enviar dados. Tente novamente.' }
  }

  return {}
}

// ─── Helper: gera eventos para pacote fixo via aprovação de convite ──────────

const DOW_TO_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

function gerarEventosPacoteFixoConvite(params: {
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
    const dayKey  = DOW_TO_KEY[d.getDay()]
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
