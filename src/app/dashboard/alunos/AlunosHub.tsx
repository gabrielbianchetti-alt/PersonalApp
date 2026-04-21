'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Link2, UserPlus } from 'lucide-react'
import { TabBar } from '@/components/dashboard/TabBar'
import { AlunosGrid } from '@/components/alunos/AlunosGrid'
import { TabSkeleton } from '@/components/ui/TabSkeleton'
import { DIAS_SEMANA, DURACAO_OPCOES } from '@/types/aluno'
import { ConvidarAlunoModal } from './ConvidarAlunoModal'
import { AprovacaoCard, PendenteCard } from './AprovacoesSection'
import type { SuspensaoRow } from '../suspensoes/types'
import type { ModeloTermo, TermoEnviado } from '../termos/types'
import type {
  ConviteRow, ConvitePendenteComAluno,
} from '../convites/actions'

// Abas secundárias viram chunks separados — só baixam na primeira visita.
// A lista principal (AlunosGrid) continua eager porque é o landing da rota.
const NovoAlunoForm = dynamic(
  () => import('./novo/NovoAlunoForm').then(m => ({ default: m.NovoAlunoForm })),
  { loading: () => <TabSkeleton /> },
)
const Suspensoes = dynamic(
  () => import('../suspensoes/Suspensoes').then(m => ({ default: m.Suspensoes })),
  { loading: () => <TabSkeleton /> },
)
const Termos = dynamic(
  () => import('../termos/Termos').then(m => ({ default: m.Termos })),
  { loading: () => <TabSkeleton /> },
)

// ─── types ────────────────────────────────────────────────────────────────────

export interface AlunoFull {
  id: string
  nome: string
  whatsapp: string
  horarios: { dia: string; horario: string }[]
  local: string
  valor: number
  modelo_cobranca: 'por_aula' | 'mensalidade'
  data_inicio: string
  status: string
  duracao: number
}

export interface AlunoMinimal {
  id: string
  nome: string
  horarios: { dia: string; horario: string }[]
}

export type AlunosTab = 'lista' | 'novo' | 'aprovacao' | 'suspensos' | 'termos'

interface Props {
  initialTab: AlunosTab
  showSuccess: boolean
  alunos: AlunoFull[]
  alunosPausados: AlunoMinimal[]
  suspensoesIniciais: SuspensaoRow[]
  modelos: ModeloTermo[]
  historicoTermos: TermoEnviado[]
  convitesIniciais?: ConviteRow[]
  aprovacoesIniciais?: ConvitePendenteComAluno[]
  alunoIdInicial?: string
}

// ─── inline toast (sem side-effects de roteamento) ───────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone() }, 4000)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(16, 185, 129,0.3)',
        color: 'var(--text-primary)',
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--green-muted)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => { setVisible(false); onDone() }}
        className="ml-2 cursor-pointer"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

export function AlunosHub({
  initialTab,
  showSuccess,
  alunos: initialAlunos,
  alunosPausados,
  suspensoesIniciais,
  modelos,
  historicoTermos,
  convitesIniciais = [],
  aprovacoesIniciais = [],
  alunoIdInicial,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<AlunosTab>(initialTab)

  // Local alunos list — updated immediately on creation, no page reload needed
  const [alunos, setAlunos] = useState<AlunoFull[]>(initialAlunos)

  // Toast: toastKey > 0 means "show toast"; increment to re-trigger
  const [toastKey, setToastKey] = useState(showSuccess ? 1 : 0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modal de gerar convite
  const [convidarOpen, setConvidarOpen] = useState(false)

  // Lists locais dos convites (para refresh sem reload)
  const [convites, setConvites] = useState<ConviteRow[]>(convitesIniciais)
  const [aprovacoes, setAprovacoes] = useState<ConvitePendenteComAluno[]>(aprovacoesIniciais)

  const convitesPendentes = convites.filter(c => c.status === 'pendente' || c.status === 'expirado')
  const aprovacoesCount   = aprovacoes.length

  const TABS = [
    { key: 'lista',      label: 'Lista' },
    { key: 'novo',       label: '+ Novo' },
    { key: 'aprovacao',  label: aprovacoesCount > 0 ? `Aprovações (${aprovacoesCount})` : 'Aprovações' },
    { key: 'suspensos',  label: 'Suspensos' },
    { key: 'termos',     label: 'Termos' },
  ]

  // Called by NovoAlunoForm after a successful insert
  function handleAlunoCreated(raw: Record<string, unknown>) {
    const newAluno = raw as unknown as AlunoFull
    setAlunos(prev =>
      [...prev, newAluno].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      )
    )
    setTab('lista')
    setToastKey(k => k + 1)

    // Sync server cache in the background (after UI is already updated)
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => router.refresh(), 300)
  }

  return (
    <div className="flex flex-col min-h-full">

      {toastKey > 0 && (
        <Toast
          key={toastKey}
          message="Aluno cadastrado com sucesso!"
          onDone={() => setToastKey(0)}
        />
      )}

      {/* Section header + tabs */}
      <div
        className="px-4 md:px-6 pt-5 shrink-0"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Alunos</h1>
            {tab === 'lista' && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {alunos.length} {alunos.length === 1 ? 'aluno ativo' : 'alunos ativos'}
              </p>
            )}
            {tab === 'suspensos' && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {alunosPausados.length} {alunosPausados.length === 1 ? 'aluno pausado' : 'alunos pausados'}
              </p>
            )}
          </div>
          {/* Ações no topo — só na aba lista */}
          {tab === 'lista' && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setConvidarOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: 'var(--green-muted)',
                  color: 'var(--green-primary)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}>
                <Link2 size={13} strokeWidth={1.75} aria-hidden />
                Convidar
              </button>
              <button type="button" onClick={() => setTab('novo')}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: 'var(--green-primary)', color: '#000' }}>
                <UserPlus size={13} strokeWidth={2} aria-hidden />
                Novo aluno
              </button>
            </div>
          )}
        </div>
        <TabBar tabs={TABS} active={tab} onChange={(k) => setTab(k as AlunosTab)} />
      </div>

      {/* Tab content */}
      <div className="flex-1">

        {/* ── Lista ── */}
        {tab === 'lista' && (
          <div className="p-4 md:p-6">
            {alunos.length === 0 ? (
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
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum aluno cadastrado</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Comece adicionando seu primeiro aluno</p>
                <button
                  onClick={() => setTab('novo')}
                  className="mt-5 flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--green-primary)', color: '#000' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Cadastrar primeiro aluno
                </button>
              </div>
            ) : (
              <AlunosGrid alunos={alunos} diasSemana={DIAS_SEMANA} duracaoOpcoes={DURACAO_OPCOES} />
            )}
          </div>
        )}

        {/* ── Novo Aluno ── */}
        {tab === 'novo' && (
          <NovoAlunoForm
            onSuccess={handleAlunoCreated}
            onCancel={() => setTab('lista')}
          />
        )}

        {/* ── Aprovação ── */}
        {tab === 'aprovacao' && (
          <div className="p-4 md:p-6 flex flex-col gap-4" style={{ maxWidth: 720, margin: '0 auto' }}>

            {/* Seção: Aguardando aprovação */}
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Aguardando aprovação
                {aprovacoes.length > 0 && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({aprovacoes.length})
                  </span>
                )}
              </p>
              {aprovacoes.length === 0 ? (
                <div className="rounded-2xl p-6 text-center"
                  style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Nenhum aluno aguardando aprovação no momento.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {aprovacoes.map(c => (
                    <AprovacaoCard key={c.id} convite={c}
                      onChanged={() => {
                        setAprovacoes(prev => prev.filter(x => x.id !== c.id))
                        router.refresh()
                      }} />
                  ))}
                </div>
              )}
            </div>

            {/* Seção: Convites pendentes */}
            <div className="mt-2">
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Convites pendentes
                {convitesPendentes.length > 0 && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({convitesPendentes.length})
                  </span>
                )}
              </p>
              {convitesPendentes.length === 0 ? (
                <div className="rounded-2xl p-6 text-center"
                  style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    Nenhum convite ativo.
                  </p>
                  <button type="button" onClick={() => setConvidarOpen(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ background: 'var(--green-primary)', color: '#000' }}>
                    <Link2 size={12} strokeWidth={2} aria-hidden />
                    Gerar convite
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {convitesPendentes.map(c => (
                    <PendenteCard key={c.id} convite={c}
                      onChanged={() => {
                        setConvites(prev => prev.filter(x => x.id !== c.id))
                        router.refresh()
                      }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Suspensos ── */}
        {tab === 'suspensos' && (
          <Suspensoes
            alunosAtivos={alunos}
            alunosPausados={alunosPausados}
            suspensoesIniciais={suspensoesIniciais}
          />
        )}

        {/* ── Termos ── */}
        {tab === 'termos' && (
          <Termos
            alunos={alunos}
            modelos={modelos}
            historicoInicial={historicoTermos}
            alunoIdInicial={alunoIdInicial}
          />
        )}

      </div>

      {/* Modal de convidar */}
      {convidarOpen && (
        <ConvidarAlunoModal
          onClose={() => setConvidarOpen(false)}
          onCreated={(c) => {
            setConvites(prev => [c, ...prev])
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
