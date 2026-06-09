import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FinanceiroHub } from './FinanceiroHub'
import type { FinanceiroTab } from './FinanceiroHub'
import { listPacotesAction } from '../pacotes/actions'
import { isDemoMode } from '@/lib/demo/mode'
import { getUserState } from '@/lib/user-state'
import {
  getDemoAlunos, getDemoCobrancas, getDemoPacotes,
  getDemoPreferencias,
} from '@/lib/demo/fixtures'
import type { PacoteComAluno } from '../pacotes/actions'

export const metadata: Metadata = { title: 'Financeiro — PersonalHub' }

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const demo = await isDemoMode()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !demo) return null

  const today    = new Date()
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const demoAlunosList = demo ? getDemoAlunos() : []
  const demoPacotesList = demo ? getDemoPacotes() : []

  const demoData = demo ? {
    alunos:         demoAlunosList,
    cobrancas:      getDemoCobrancas(),
    prefs:          getDemoPreferencias(),
    creditos:       [],
    pacotes:        demoPacotesList.map(p => ({
      ...p,
      aluno_nome: demoAlunosList.find(a => a.id === p.aluno_id)?.nome ?? '—',
    })) as PacoteComAluno[],
  } : null

  const [
    { data: alunos },
    { data: cobrancas },
    { data: prefs },
    { data: creditos },
    pacotesRes,
  ] = demo ? [
    { data: demoData!.alunos },
    { data: demoData!.cobrancas },
    { data: demoData!.prefs },
    { data: demoData!.creditos },
    { data: demoData!.pacotes, error: undefined },
  ] as const : await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, whatsapp, horarios, modelo_cobranca, valor, dia_cobranca')
      .eq('professor_id', user!.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('cobrancas')
      .select('*')
      .eq('professor_id', user!.id)
      .eq('mes_referencia', mesAtual),
    supabase
      .from('preferencias_cobranca')
      .select('*')
      .eq('professor_id', user!.id)
      .maybeSingle(),
    supabase
      .from('faltas')
      .select('aluno_id, credito_valor')
      .eq('professor_id', user!.id)
      .eq('status', 'credito')
      .or(`mes_validade.is.null,mes_validade.eq.${mesAtual}`),
    listPacotesAction(),
  ])

  // Build creditos map
  const creditosPorAluno: Record<string, number> = {}
  for (const row of (creditos ?? [])) {
    if (row.credito_valor) {
      creditosPorAluno[row.aluno_id] = (creditosPorAluno[row.aluno_id] ?? 0) + Number(row.credito_valor)
    }
  }

  // Determine initial tab
  const validTabs: FinanceiroTab[] = ['calculo', 'cobranca', 'pacotes']
  const rawTab = params.tab as FinanceiroTab
  const initialTab: FinanceiroTab = validTabs.includes(rawTab) ? rawTab : 'calculo'

  const alunosList = alunos ?? []

  // Para o banner de "X cobranças vencidas". Em demo, deixa zero (não tem
  // sentido mostrar alertas em dados fictícios).
  const userState = !demo ? await getUserState().catch(() => null) : null
  const cobrancasVencidasCount =
    userState?.menuAlertsEnabled !== false ? (userState?.cobrancasVencidasCount ?? 0) : 0

  return (
    <FinanceiroHub
      initialTab={initialTab}
      alunosCalculo={alunosList}
      alunosCobranca={alunosList}
      cobrancasIniciais={cobrancas ?? []}
      preferencias={prefs ?? null}
      creditosPorAluno={creditosPorAluno}
      mesInicial={mesAtual}
      pacotes={pacotesRes.data ?? []}
      cobrancasVencidasCount={cobrancasVencidasCount}
    />
  )
}
