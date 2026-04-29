import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FinanceiroHub } from './FinanceiroHub'
import type { FinanceiroTab } from './FinanceiroHub'
import { listPacotesAction } from '../pacotes/actions'
import {
  ensureFixosForMesAction,
  getReceitasExtrasForMesAction,
  getHistoricoFinanceiroAction,
  type CustoRow,
  type ReceitaExtraRow,
  type HistoricoMes,
} from './actions'
import { isDemoMode } from '@/lib/demo/mode'
import {
  getDemoAlunos, getDemoCobrancas, getDemoCustos, getDemoPacotes,
  getDemoPreferencias, getDemoReceitasExtras, getDemoHistorico,
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

  // Compute last 6 months ending at mesAtual for the historico chart
  function getLast6Months(endMes: string): string[] {
    const [y, mo] = endMes.split('-').map(Number)
    const month = mo - 1
    const result: string[] = []
    for (let i = 5; i >= 0; i--) {
      let m = month - i
      let yr = y
      while (m < 0) { m += 12; yr-- }
      result.push(`${yr}-${String(m + 1).padStart(2, '0')}`)
    }
    return result
  }
  const mesesHistorico = getLast6Months(mesAtual)

  // Replicate active fixos into the current month before the parallel fetch
  if (!demo) await ensureFixosForMesAction(mesAtual)

  // Mapeia histórico com receita calculada dos alunos demo (aulas do mês)
  const demoAlunosList = demo ? getDemoAlunos() : []
  const demoPacotesList = demo ? getDemoPacotes() : []
  const demoHistoricoBase = demo ? getDemoHistorico() : []
  const demoHistorico: HistoricoMes[] = demoHistoricoBase.map(h => ({
    mes: h.mes,
    custos: h.custos,
    receitas_extras: h.receitas_extras,
  })) as HistoricoMes[]

  const demoData = demo ? {
    alunos:         demoAlunosList,
    custos:         getDemoCustos(),
    cobrancas:      getDemoCobrancas(),
    prefs:          getDemoPreferencias(),
    creditos:       [],
    receitasExtras: getDemoReceitasExtras(),
    historico:      demoHistorico,
    pacotes:        demoPacotesList.map(p => ({
      ...p,
      aluno_nome: demoAlunosList.find(a => a.id === p.aluno_id)?.nome ?? '—',
    })) as PacoteComAluno[],
  } : null

  const [
    { data: alunos },
    { data: custos },
    { data: cobrancas },
    { data: prefs },
    { data: creditos },
    { data: receitasExtras },
    { data: historico },
    pacotesRes,
  ] = demo ? [
    { data: demoData!.alunos },
    { data: demoData!.custos },
    { data: demoData!.cobrancas },
    { data: demoData!.prefs },
    { data: demoData!.creditos },
    { data: demoData!.receitasExtras },
    { data: demoData!.historico },
    { data: demoData!.pacotes, error: undefined },
  ] as const : await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, whatsapp, horarios, modelo_cobranca, valor, dia_cobranca')
      .eq('professor_id', user!.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('custos')
      .select('*')
      .eq('professor_id', user!.id)
      .eq('mes_referencia', mesAtual)
      .or('ativo.is.null,ativo.eq.true')
      .order('created_at', { ascending: false }),
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
    getReceitasExtrasForMesAction(mesAtual),
    getHistoricoFinanceiroAction(mesesHistorico),
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
  const validTabs: FinanceiroTab[] = ['calculo', 'cobranca', 'custos', 'pacotes']
  const rawTab = params.tab as FinanceiroTab
  const initialTab: FinanceiroTab = validTabs.includes(rawTab) ? rawTab : 'calculo'

  const alunosList = alunos ?? []

  return (
    <FinanceiroHub
      initialTab={initialTab}
      alunosCalculo={alunosList}
      alunosCobranca={alunosList}
      cobrancasIniciais={cobrancas ?? []}
      preferencias={prefs ?? null}
      creditosPorAluno={creditosPorAluno}
      mesInicial={mesAtual}
      alunosCustos={alunosList}
      custosIniciais={(custos ?? []) as CustoRow[]}
      receitasExtrasIniciais={(receitasExtras ?? []) as ReceitaExtraRow[]}
      historicoIniciais={(historico ?? []) as HistoricoMes[]}
      pacotes={pacotesRes.data ?? []}
    />
  )
}
