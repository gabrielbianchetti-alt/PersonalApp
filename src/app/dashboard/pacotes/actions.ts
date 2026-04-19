'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addDays } from '@/types/aluno'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

export interface PacoteRow {
  id:                string
  professor_id:      string
  aluno_id:          string
  quantidade_total:  number
  quantidade_usada:  number
  valor:             number
  validade_dias:     number
  data_inicio:       string
  data_vencimento:   string
  data_cobranca:     string
  status:            'ativo' | 'vencido' | 'finalizado'
  renovacao_de:      string | null
  created_at:        string
  updated_at:        string
}

export interface PacoteComAluno extends PacoteRow {
  aluno_nome: string
}

export interface AulaUsada {
  evento_id:       string
  data_especifica: string | null
  horario_inicio:  string
  duracao:         number
}

// ─── List all pacotes for the professor (with aluno name) ──────────────────────
export async function listPacotesAction(): Promise<{ data?: PacoteComAluno[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('pacotes')
    .select('*, alunos:aluno_id(nome)')
    .eq('professor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('listPacotes:', error)
    return { error: 'Erro ao carregar pacotes.' }
  }

  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const aluno = r.alunos as { nome: string } | null
    const { alunos: _unused, ...rest } = r
    void _unused
    return { ...rest, aluno_nome: aluno?.nome ?? '—' } as PacoteComAluno
  })

  // Auto-update status if vencido/finalizado sem precisar de cron
  const today = new Date().toISOString().split('T')[0]
  for (const p of rows) {
    if (p.status === 'ativo') {
      if (p.quantidade_usada >= p.quantidade_total) p.status = 'finalizado'
      else if (p.data_vencimento < today) p.status = 'vencido'
    }
  }

  return { data: rows }
}

// ─── Get a single pacote by id (with aulas usadas) ─────────────────────────────
export async function getPacoteAction(pacoteId: string): Promise<{
  data?: { pacote: PacoteComAluno; aulas: AulaUsada[] }
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: p, error } = await supabase
    .from('pacotes')
    .select('*, alunos:aluno_id(nome)')
    .eq('id', pacoteId)
    .eq('professor_id', user.id)
    .single()

  if (error || !p) return { error: 'Pacote não encontrado.' }

  const alunoObj = (p as Record<string, unknown>).alunos as { nome: string } | null
  const { alunos: _discard, ...rest } = p as Record<string, unknown>
  void _discard
  const pacote: PacoteComAluno = { ...rest, aluno_nome: alunoObj?.nome ?? '—' } as PacoteComAluno

  const { data: aulas } = await supabase
    .from('eventos_agenda')
    .select('id, data_especifica, horario_inicio, duracao')
    .eq('professor_id', user.id)
    .eq('pacote_id', pacoteId)
    .order('data_especifica', { ascending: false })
    .order('horario_inicio', { ascending: false })

  const aulasUsadas: AulaUsada[] = (aulas ?? []).map(a => ({
    evento_id:       a.id,
    data_especifica: a.data_especifica,
    horario_inicio:  a.horario_inicio,
    duracao:         a.duracao,
  }))

  return { data: { pacote, aulas: aulasUsadas } }
}

// ─── Get active pacote for a specific aluno (used by agenda) ───────────────────
export async function getPacoteAtivoAction(alunoId: string): Promise<{
  data?: PacoteRow | null
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('pacotes')
    .select('*')
    .eq('professor_id', user.id)
    .eq('aluno_id', alunoId)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) return { error: error.message }
  return { data: (data?.[0] ?? null) as PacoteRow | null }
}

// ─── Renovar pacote (cria um novo baseado em um anterior) ──────────────────────
export async function renovarPacoteAction(params: {
  pacoteAnteriorId: string
  quantidade_total: number
  valor:            number
  validade_dias:    number
  data_inicio:      string
  data_cobranca:    string
  transferir_saldo: boolean
}): Promise<{ data?: PacoteRow; error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: anterior, error: getErr } = await supabase
    .from('pacotes')
    .select('*')
    .eq('id', params.pacoteAnteriorId)
    .eq('professor_id', user.id)
    .single()

  if (getErr || !anterior) return { error: 'Pacote anterior não encontrado.' }

  const saldo    = Math.max(0, anterior.quantidade_total - anterior.quantidade_usada)
  const qtdTotal = params.transferir_saldo ? params.quantidade_total + saldo : params.quantidade_total
  const vencimento = addDays(params.data_inicio, params.validade_dias)

  // Marca o anterior como finalizado
  await supabase
    .from('pacotes')
    .update({ status: 'finalizado', updated_at: new Date().toISOString() })
    .eq('id', params.pacoteAnteriorId)
    .eq('professor_id', user.id)

  // Cria o novo
  const { data: novo, error: insErr } = await supabase
    .from('pacotes')
    .insert({
      professor_id:     user.id,
      aluno_id:         anterior.aluno_id,
      quantidade_total: qtdTotal,
      quantidade_usada: 0,
      valor:            params.valor,
      validade_dias:    params.validade_dias,
      data_inicio:      params.data_inicio,
      data_vencimento:  vencimento,
      data_cobranca:    params.data_cobranca,
      status:           'ativo',
      renovacao_de:     params.pacoteAnteriorId,
    })
    .select()
    .single()

  if (insErr) return { error: insErr.message }

  revalidatePath('/dashboard/pacotes')
  return { data: novo as PacoteRow }
}

// ─── Incrementar quantidade_usada (chamado quando aula de pacote é criada) ────
export async function consumirAulaPacoteAction(pacoteId: string): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: p } = await supabase
    .from('pacotes')
    .select('quantidade_usada, quantidade_total')
    .eq('id', pacoteId)
    .eq('professor_id', user.id)
    .single()

  if (!p) return { error: 'Pacote não encontrado.' }

  const novaUsada = (p.quantidade_usada ?? 0) + 1
  const novoStatus = novaUsada >= p.quantidade_total ? 'finalizado' : 'ativo'

  const { error } = await supabase
    .from('pacotes')
    .update({ quantidade_usada: novaUsada, status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', pacoteId)
    .eq('professor_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/pacotes')
  return {}
}

// ─── Devolve aula ao pacote (cancelamento pelo professor) ─────────────────────
export async function devolverAulaPacoteAction(pacoteId: string): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: p } = await supabase
    .from('pacotes')
    .select('quantidade_usada')
    .eq('id', pacoteId)
    .eq('professor_id', user.id)
    .single()

  if (!p) return { error: 'Pacote não encontrado.' }

  const novaUsada = Math.max(0, (p.quantidade_usada ?? 0) - 1)

  const { error } = await supabase
    .from('pacotes')
    .update({ quantidade_usada: novaUsada, status: 'ativo', updated_at: new Date().toISOString() })
    .eq('id', pacoteId)
    .eq('professor_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/pacotes')
  return {}
}
