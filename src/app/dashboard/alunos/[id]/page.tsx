import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DIAS_LABEL, formatCurrency, formatDate } from '@/types/aluno'
import { DeleteAlunoButton } from './DeleteAlunoButton'
import { EditAlunoButton } from './EditAlunoButton'
import { AlunoPacoteCard } from './AlunoPacoteCard'
import type { PacoteRow, AulaUsada } from '../../pacotes/actions'
import { isDemoMode } from '@/lib/demo/mode'
import { getDemoAlunos, getDemoPacotes, getDemoEventos } from '@/lib/demo/fixtures'

export const metadata: Metadata = { title: 'Perfil do Aluno — PersonalHub' }

export default async function AlunoPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const demo = await isDemoMode()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !demo) return null

  const aluno = demo
    ? getDemoAlunos().find(a => a.id === id) ?? null
    : (await supabase
        .from('alunos')
        .select('*')
        .eq('id', id)
        .eq('professor_id', user!.id)
        .single()).data

  if (!aluno) notFound()

  // Active pacote (for pacote-model students) — full data for card + edit prefill
  const isPacote = aluno.modelo_cobranca === 'pacote'
  let pacoteFull: PacoteRow | null = null
  let aulasPacote: AulaUsada[] = []
  if (isPacote) {
    if (demo) {
      const demoPkg = getDemoPacotes().find(p => p.aluno_id === id)
      pacoteFull = (demoPkg ?? null) as PacoteRow | null
      if (pacoteFull) {
        aulasPacote = getDemoEventos()
          .filter(e => e.pacote_id === pacoteFull!.id)
          .map(a => ({
            evento_id:       a.id,
            data_especifica: a.data_especifica,
            horario_inicio:  a.horario_inicio,
            duracao:         a.duracao,
          }))
      }
    } else {
      const { data: pkg } = await supabase
        .from('pacotes')
        .select('*')
        .eq('professor_id', user!.id)
        .eq('aluno_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      pacoteFull = (pkg ?? null) as PacoteRow | null

      if (pacoteFull) {
        const { data: aulas } = await supabase
          .from('eventos_agenda')
          .select('id, data_especifica, horario_inicio, duracao')
          .eq('professor_id', user!.id)
          .eq('pacote_id', pacoteFull.id)
          .order('data_especifica', { ascending: false })
          .order('horario_inicio', { ascending: false })
        aulasPacote = (aulas ?? []).map(a => ({
          evento_id:       a.id,
          data_especifica: a.data_especifica,
          horario_inicio:  a.horario_inicio,
          duracao:         a.duracao,
        }))
      }
    }
  }

  const pacoteAtivo = pacoteFull && pacoteFull.status === 'ativo'
    ? {
        quantidade_total: pacoteFull.quantidade_total,
        validade_dias:    pacoteFull.validade_dias,
        data_inicio:      pacoteFull.data_inicio,
        data_cobranca:    pacoteFull.data_cobranca,
        tipo_pacote:      pacoteFull.tipo_pacote,
      }
    : null

  // Pending faltas
  const { data: faltasPendentes } = demo ? { data: [] as { id: string }[] } : await supabase
    .from('faltas')
    .select('id')
    .eq('professor_id', user!.id)
    .eq('aluno_id', id)
    .eq('status', 'pendente')

  const horarios: { dia: string; horario: string }[] = aluno.horarios ?? []

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      {/* Back + Edit row */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/dashboard/alunos"
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Alunos
        </Link>
        <EditAlunoButton aluno={{ ...aluno, pacoteAtivo: pacoteAtivo ?? null }} />
      </div>

      {/* Header card */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
          >
            {aluno.nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{aluno.nome}</h1>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={aluno.status === 'ativo'
                  ? { background: 'var(--green-muted)', color: 'var(--green-primary)' }
                  : { background: 'var(--bg-input)', color: 'var(--text-muted)' }
                }
              >
                {aluno.status}
              </span>
            </div>
            {aluno.whatsapp && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                📱 {aluno.whatsapp}
              </p>
            )}
          </div>
        </div>

        {/* Treino info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Horários', value: horarios.length === 0 ? '—' : horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(' · ') },
            { label: 'Local', value: aluno.local || '—' },
            { label: 'Valor', value: formatCurrency(Number(aluno.valor)) + (
              aluno.modelo_cobranca === 'mensalidade' ? '/mês'
              : aluno.modelo_cobranca === 'pacote'    ? '/pacote'
              : '/aula'
            ) },
            { label: 'Início', value: aluno.data_inicio ? formatDate(aluno.data_inicio) : '—' },
            { label: 'Duração', value: aluno.duracao ? `${aluno.duracao} min` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-input)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pacote card — só quando o aluno é modelo pacote */}
      {isPacote && (
        <AlunoPacoteCard pacote={pacoteFull} aulas={aulasPacote} alunoNome={aluno.nome} />
      )}

      {/* Quick actions */}
      <div className="mb-4">
        {/* Registrar Falta */}
        <Link
          href="/dashboard/faltas"
          className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11,0.12)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Faltas</p>
            <p className="text-xs mt-0.5" style={{ color: (faltasPendentes?.length ?? 0) > 0 ? '#F59E0B' : 'var(--text-muted)' }}>
              {(faltasPendentes?.length ?? 0) > 0
                ? `${faltasPendentes!.length} pendente${faltasPendentes!.length > 1 ? 's' : ''}`
                : 'Sem pendências'}
            </p>
          </div>
        </Link>
      </div>

      {/* Objetivos */}
      {(aluno.objetivos?.length ?? 0) > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Objetivos</p>
          <div className="flex flex-wrap gap-1.5">
            {(aluno.objetivos as string[]).map((o: string) => (
              <span key={o} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                {o}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      {aluno.observacoes && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Observações</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{aluno.observacoes}</p>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68,0.15)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(239, 68, 68,0.7)' }}>Zona de perigo</p>
        <DeleteAlunoButton alunoId={id} alunoNome={aluno.nome} />
      </div>
    </div>
  )
}
