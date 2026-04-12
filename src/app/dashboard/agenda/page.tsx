import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { processVencidosAction } from '../faltas/actions'
import { AgendaHub } from './AgendaHub'
import type { AgendaTab } from './AgendaHub'
import type { FaltaRow, PrefsF } from '../faltas/actions'

export const metadata: Metadata = { title: 'Agenda — PersonalHub' }

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Auto-process expired faltas on page load
  await processVencidosAction()

  // Current week Mon–Sun
  const today = new Date()
  const dow = today.getDay()
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMon)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  function toDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const weekStart = toDateStr(monday)
  const weekEnd   = toDateStr(sunday)

  const [
    { data: alunos },
    { data: eventos },
    { data: faltas },
    { data: prefs },
  ] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, horarios, duracao, local, modelo_cobranca, observacoes')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('eventos_agenda')
      .select('*')
      .eq('professor_id', user.id)
      .or(`dia_semana.not.is.null,and(data_especifica.gte.${weekStart},data_especifica.lte.${weekEnd})`),
    supabase
      .from('faltas')
      .select('*, alunos(nome)')
      .eq('professor_id', user.id)
      .order('data_falta', { ascending: false }),
    supabase
      .from('preferencias_faltas')
      .select('ativo, prazo_dias, alerta_dias')
      .eq('professor_id', user.id)
      .single(),
  ])

  // Enrich faltas with aluno names
  const faltasRows: FaltaRow[] = (faltas ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    aluno_nome: (r.alunos as { nome: string } | null)?.nome ?? '—',
  })) as FaltaRow[]

  const prefsDefault: PrefsF = prefs ?? { ativo: false, prazo_dias: 30, alerta_dias: 5 }

  // Alunos for faltas (id + nome only)
  const alunosFaltas = (alunos ?? []).map(a => ({ id: a.id, nome: a.nome }))

  // Determine initial tab
  const validTabs: AgendaTab[] = ['grade', 'faltas']
  const rawTab = params.tab as AgendaTab
  const initialTab: AgendaTab = validTabs.includes(rawTab) ? rawTab : 'grade'

  return (
    <AgendaHub
      initialTab={initialTab}
      alunos={alunos ?? []}
      eventosIniciais={eventos ?? []}
      alunosFaltas={alunosFaltas}
      faltasIniciais={faltasRows}
      prefsIniciais={prefsDefault}
    />
  )
}
