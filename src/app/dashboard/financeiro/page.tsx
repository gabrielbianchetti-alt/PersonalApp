import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Financeiro } from './Financeiro'
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

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today  = new Date()
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Seed fixos, then fetch everything in parallel
  await seedFixosIfNeeded(supabase, user.id, mesAtual)

  const [{ data: alunos }, { data: custos }] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, modelo_cobranca, valor, dias_semana')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('custos')
      .select('*')
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesAtual)
      .order('created_at', { ascending: false }),
  ])

  return (
    <Financeiro
      alunos={alunos ?? []}
      custosIniciais={(custos ?? []) as CustoRow[]}
      mesInicial={mesAtual}
    />
  )
}
