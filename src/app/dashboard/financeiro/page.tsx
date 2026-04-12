import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FinanceiroHub } from './FinanceiroHub'
import type { FinanceiroTab } from './FinanceiroHub'
import type { CustoRow } from './actions'

export const metadata: Metadata = { title: 'Financeiro — PersonalHub' }

// Replicates custos fixos from the most recent month into mesRef if none exist yet.
async function seedFixosIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  professorId: string,
  mesRef: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('custos').select('id')
    .eq('professor_id', professorId).eq('mes_referencia', mesRef).eq('tipo', 'fixo').limit(1)
  if (existing && existing.length > 0) return

  const { data: allFixos } = await supabase
    .from('custos').select('nome, valor, categoria, mes_referencia')
    .eq('professor_id', professorId).eq('tipo', 'fixo').neq('mes_referencia', mesRef)
    .order('mes_referencia', { ascending: false })
  if (!allFixos || allFixos.length === 0) return

  const recentMes   = allFixos[0].mes_referencia
  const fixosToCopy = allFixos.filter((f) => f.mes_referencia === recentMes)
  if (fixosToCopy.length === 0) return

  await supabase.from('custos').insert(
    fixosToCopy.map((f) => ({
      professor_id: professorId,
      nome: f.nome, valor: f.valor, tipo: 'fixo', categoria: f.categoria,
      mes_referencia: mesRef, data: null,
    }))
  )
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today   = new Date()
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Seed fixos for current month before parallel fetch
  await seedFixosIfNeeded(supabase, user.id, mesAtual)

  const [
    { data: alunos },
    { data: custos },
    { data: cobrancas },
    { data: prefs },
    { data: creditos },
  ] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, whatsapp, dias_semana, modelo_cobranca, valor, forma_pagamento')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('custos')
      .select('*')
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesAtual)
      .order('created_at', { ascending: false }),
    supabase
      .from('cobrancas')
      .select('*')
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesAtual),
    supabase
      .from('preferencias_cobranca')
      .select('*')
      .eq('professor_id', user.id)
      .maybeSingle(),
    supabase
      .from('faltas')
      .select('aluno_id, credito_valor')
      .eq('professor_id', user.id)
      .eq('status', 'credito'),
  ])

  // Build creditos map
  const creditosPorAluno: Record<string, number> = {}
  for (const row of (creditos ?? [])) {
    if (row.credito_valor) {
      creditosPorAluno[row.aluno_id] = (creditosPorAluno[row.aluno_id] ?? 0) + Number(row.credito_valor)
    }
  }

  // Determine initial tab
  const validTabs: FinanceiroTab[] = ['calculo', 'cobranca', 'custos']
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
    />
  )
}
