import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { seedModelosIfNeeded } from '../termos/actions'
import { AlunosHub } from './AlunosHub'
import type { AlunosTab, AlunoFull, AlunoMinimal } from './AlunosHub'
import type { SuspensaoRow } from '../suspensoes/types'
import type { HorarioDia } from '@/types/aluno'
import type { ModeloTermo, TermoEnviado } from '../termos/types'

export const metadata: Metadata = { title: 'Alunos — PersonalHub' }

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; success?: string; aluno_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Seed default termo templates on first access
  await seedModelosIfNeeded(user.id)

  const [
    { data: alunos },
    { data: alunosPausados },
    { data: suspensoes },
    { data: modelos },
    { data: historico },
  ] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, whatsapp, horarios, local, valor, modelo_cobranca, data_inicio, status, duracao')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('alunos')
      .select('id, nome, horarios')
      .eq('professor_id', user.id)
      .eq('status', 'pausado')
      .order('nome'),
    supabase
      .from('suspensoes')
      .select('*, alunos(nome, horarios)')
      .eq('professor_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('modelos_termo')
      .select('*')
      .eq('professor_id', user.id)
      .order('created_at'),
    supabase
      .from('termos_enviados')
      .select('*, alunos(nome)')
      .eq('professor_id', user.id)
      .order('enviado_em', { ascending: false }),
  ])

  // Enrich suspensoes with joined aluno data
  const suspensoesRows: SuspensaoRow[] = (suspensoes ?? []).map((r: Record<string, unknown>) => {
    const al = r.alunos as { nome: string; horarios: HorarioDia[] } | null
    const { alunos: _al, ...rest } = r
    void _al
    return {
      ...rest,
      aluno_nome:     al?.nome ?? '—',
      aluno_horarios: al?.horarios ?? [],
    }
  }) as unknown as SuspensaoRow[]

  // Enrich historico with aluno names
  const historicoRows: TermoEnviado[] = (historico ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    aluno_nome: (r.alunos as { nome: string } | null)?.nome ?? '—',
  })) as TermoEnviado[]

  // Determine initial tab
  const validTabs: AlunosTab[] = ['lista', 'novo', 'suspensos', 'termos']
  const rawTab = params.tab as AlunosTab
  const initialTab: AlunosTab = validTabs.includes(rawTab) ? rawTab : 'lista'

  return (
    <AlunosHub
      initialTab={initialTab}
      showSuccess={params.success === '1'}
      alunos={(alunos ?? []) as AlunoFull[]}
      alunosPausados={(alunosPausados ?? []) as AlunoMinimal[]}
      suspensoesIniciais={suspensoesRows}
      modelos={(modelos ?? []) as ModeloTermo[]}
      historicoTermos={historicoRows}
      alunoIdInicial={params.aluno_id}
    />
  )
}
