import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { processVencidosAction } from './actions'
import { Faltas } from './Faltas'
import type { FaltaRow, PrefsF } from './actions'

export const metadata: Metadata = { title: 'Faltas — PersonalHub' }

export default async function FaltasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Auto-process expired faltas on page load
  await processVencidosAction()

  const [
    { data: alunos },
    { data: faltas },
    { data: prefs },
  ] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
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

  const faltasRows: FaltaRow[] = (faltas ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    aluno_nome: (r.alunos as { nome: string } | null)?.nome ?? '—',
  })) as FaltaRow[]

  const prefsDefault: PrefsF = prefs ?? { ativo: false, prazo_dias: 30, alerta_dias: 5 }

  return (
    <Faltas
      alunos={(alunos ?? []) as { id: string; nome: string }[]}
      faltasIniciais={faltasRows}
      prefsIniciais={prefsDefault}
    />
  )
}
