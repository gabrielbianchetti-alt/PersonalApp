import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Suspensoes } from './Suspensoes'
import type { SuspensaoRow } from './types'

export const metadata: Metadata = { title: 'Suspensões — PersonalHub' }

export default async function SuspensoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: alunosAtivos },
    { data: alunosPausados },
    { data: suspensoes },
  ] = await Promise.all([
    // Active alunos for the "Nova Suspensão" modal selector
    supabase
      .from('alunos')
      .select('id, nome, horario_inicio, dias_semana')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
    // Paused alunos for the "Suspensos" tab
    supabase
      .from('alunos')
      .select('id, nome, horario_inicio, dias_semana')
      .eq('professor_id', user.id)
      .eq('status', 'pausado')
      .order('nome'),
    // All suspensions with aluno info
    supabase
      .from('suspensoes')
      .select('*, alunos(nome, horario_inicio, dias_semana)')
      .eq('professor_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const suspensoesRows: SuspensaoRow[] = (suspensoes ?? []).map((r: Record<string, unknown>) => {
    const al = r.alunos as { nome: string; horario_inicio: string; dias_semana: string[] } | null
    const { alunos: _alunos, ...rest } = r
    void _alunos
    return {
      ...rest,
      aluno_nome:    al?.nome ?? '—',
      aluno_horario: al?.horario_inicio ?? '',
      aluno_dias:    al?.dias_semana ?? [],
    }
  }) as unknown as SuspensaoRow[]

  return (
    <Suspensoes
      alunosAtivos={(alunosAtivos ?? []) as { id: string; nome: string; horario_inicio: string; dias_semana: string[] }[]}
      alunosPausados={(alunosPausados ?? []) as { id: string; nome: string; horario_inicio: string; dias_semana: string[] }[]}
      suspensoesIniciais={suspensoesRows}
    />
  )
}
