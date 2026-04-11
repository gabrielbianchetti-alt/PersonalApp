import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SuccessToast } from '@/components/ui/SuccessToast'
import { DIAS_SEMANA, formatCurrency, DURACAO_OPCOES } from '@/types/aluno'
import { AlunosGrid } from '@/components/alunos/AlunosGrid'

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const showSuccess = params.success === '1'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: alunos } = await supabase
    .from('alunos')
    .select('*')
    .eq('professor_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  const lista = alunos ?? []

  return (
    <div className="p-6 md:p-8">
      {showSuccess && <SuccessToast message="Aluno cadastrado com sucesso!" />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Alunos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {lista.length} {lista.length === 1 ? 'aluno cadastrado' : 'alunos cadastrados'}
          </p>
        </div>
        <Link
          href="/dashboard/alunos/novo"
          className="flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-sm shrink-0"
          style={{ background: 'var(--green-primary)', color: '#000' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Aluno
        </Link>
      </div>

      {/* Empty state */}
      {lista.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-input)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Nenhum aluno cadastrado
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Comece adicionando seu primeiro aluno
          </p>
          <Link
            href="/dashboard/alunos/novo"
            className="mt-5 flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--green-primary)', color: '#000' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Cadastrar primeiro aluno
          </Link>
        </div>
      )}

      {/* Grid — client component handles hover */}
      {lista.length > 0 && (
        <AlunosGrid alunos={lista} diasSemana={DIAS_SEMANA} duracaoOpcoes={DURACAO_OPCOES} />
      )}
    </div>
  )
}
