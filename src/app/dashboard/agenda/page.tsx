import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AgendaSemanal } from './AgendaSemanal'

export const metadata: Metadata = { title: 'Agenda — PersonalHub' }

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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

  const [{ data: alunos }, { data: eventos }] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, dias_semana, horario_inicio, duracao, local, modelo_cobranca, observacoes')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('eventos_agenda')
      .select('*')
      .eq('professor_id', user.id)
      // Recurring (dia_semana set) OR one-time within current week
      .or(`dia_semana.not.is.null,and(data_especifica.gte.${weekStart},data_especifica.lte.${weekEnd})`),
  ])

  return (
    <AgendaSemanal
      alunos={alunos ?? []}
      eventosIniciais={eventos ?? []}
    />
  )
}
