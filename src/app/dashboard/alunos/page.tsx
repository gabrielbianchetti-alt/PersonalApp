import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AlunosHub } from './AlunosHub'
import type { AlunosTab, AlunoFull, AlunoMinimal } from './AlunosHub'
import type { SuspensaoRow } from '../suspensoes/types'
import type { HorarioDia } from '@/types/aluno'
import { isDemoMode } from '@/lib/demo/mode'
import {
  getDemoAlunos, getDemoSuspensoes,
} from '@/lib/demo/fixtures'
import { listConvitesAction, listConvitesAprovacaoAction } from '../convites/actions'

export const metadata: Metadata = { title: 'Alunos — PersonalHub' }

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; success?: string }>
}) {
  const params = await searchParams
  const demo = await isDemoMode()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !demo) return null

  const [
    { data: alunos },
    { data: alunosPausados },
    { data: suspensoes },
  ] = demo ? [
    { data: getDemoAlunos() },
    { data: [] as AlunoMinimal[] },
    { data: getDemoSuspensoes().map(s => ({
        ...s,
        alunos: { nome: s.aluno_nome, horarios: s.aluno_horarios },
      })) as Record<string, unknown>[] },
  ] as const : await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, whatsapp, horarios, local, valor, modelo_cobranca, data_inicio, status, duracao')
      .eq('professor_id', user!.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('alunos')
      .select('id, nome, horarios')
      .eq('professor_id', user!.id)
      .eq('status', 'pausado')
      .order('nome'),
    supabase
      .from('suspensoes')
      .select('id, professor_id, aluno_id, tipo, status, data_inicio, data_retorno, motivo, acao_horario, created_at, updated_at, alunos(nome, horarios)')
      .eq('professor_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  // Enrich suspensoes with joined aluno data
  const suspensoesRows: SuspensaoRow[] = (suspensoes ?? []).map((r: Record<string, unknown>) => {
    const al = r.alunos as { nome: string; horarios: HorarioDia[] } | null
    return {
      id:            r.id as string,
      professor_id:  r.professor_id as string,
      aluno_id:      r.aluno_id as string,
      tipo:          r.tipo as SuspensaoRow['tipo'],
      status:        r.status as SuspensaoRow['status'],
      data_inicio:   r.data_inicio as string,
      data_retorno:  r.data_retorno as string | null,
      motivo:        r.motivo as string | null,
      acao_horario:  r.acao_horario as SuspensaoRow['acao_horario'],
      created_at:    r.created_at as string,
      updated_at:    r.updated_at as string,
      aluno_nome:    al?.nome ?? '—',
      aluno_horarios: al?.horarios ?? [],
    } satisfies SuspensaoRow
  })

  // Determine initial tab
  const validTabs: AlunosTab[] = ['lista', 'novo', 'aprovacao', 'suspensos']
  const rawTab = params.tab as AlunosTab
  const initialTab: AlunosTab = validTabs.includes(rawTab) ? rawTab : 'lista'

  // Convites e aprovações (só em modo real — demo retorna vazio)
  const [convitesRes, aprovacoesRes] = demo
    ? [{ data: [] }, { data: [] }]
    : await Promise.all([listConvitesAction(), listConvitesAprovacaoAction()])

  return (
    <AlunosHub
      initialTab={initialTab}
      showSuccess={params.success === '1'}
      alunos={(alunos ?? []) as AlunoFull[]}
      alunosPausados={(alunosPausados ?? []) as AlunoMinimal[]}
      suspensoesIniciais={suspensoesRows}
      convitesIniciais={convitesRes.data ?? []}
      aprovacoesIniciais={aprovacoesRes.data ?? []}
    />
  )
}
