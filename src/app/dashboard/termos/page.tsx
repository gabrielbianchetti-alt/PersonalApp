import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { seedModelosIfNeeded } from './actions'
import { Termos } from './Termos'
import type { ModeloTermo, TermoEnviado } from './actions'

export const metadata: Metadata = { title: 'Termos de Serviço — PersonalHub' }

export default async function TermosPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Seed default templates on first access
  await seedModelosIfNeeded(user.id)

  const [
    { data: alunos },
    { data: modelos },
    { data: historico },
  ] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, whatsapp, dias_semana, horario_inicio, local, valor, modelo_cobranca, data_inicio')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
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

  const historicoRows: TermoEnviado[] = (historico ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    aluno_nome: (r.alunos as { nome: string } | null)?.nome ?? '—',
  })) as TermoEnviado[]

  return (
    <Termos
      alunos={(alunos ?? []) as Parameters<typeof Termos>[0]['alunos']}
      modelos={(modelos ?? []) as ModeloTermo[]}
      historicoInicial={historicoRows}
      alunoIdInicial={params.aluno_id}
    />
  )
}
