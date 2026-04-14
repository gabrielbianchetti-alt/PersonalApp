'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { toggleBlockAction, cancelarAssinaturaAdminAction } from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

export interface AssinaturaInfo {
  status: string
  plano: string | null
  trial_fim: string | null
  periodo_fim: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export interface ProfessorRow {
  id: string
  email: string
  nome: string
  created_at: string
  last_sign_in_at: string | null
  is_blocked: boolean
  aluno_count: number
  cobranca_count: number
  assinatura: AssinaturaInfo | null
}

export interface AdminStats {
  total_professors: number
  active_professors: number
  total_alunos: number
  weekly_signups: number[]
  trials: number
  assinantes: number
  expirados: number
  sem_assinatura: number
  mrr: number
  conversao: number
  conversion_data: number[]
}

type FilterStatus = 'todos' | 'ativos' | 'inativos' | 'bloqueados'
type AssFilter    = 'todos' | 'trial' | 'active' | 'canceled' | 'sem'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diffMs = Date.now() - new Date(iso).getTime()
  const days   = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7)  return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`
  if (days < 365)return `${Math.floor(days / 30)} meses atrás`
  return `${Math.floor(days / 365)} anos atrás`
}

function isActive(lastSignIn: string | null): boolean {
  if (!lastSignIn) return false
  return Date.now() - new Date(lastSignIn).getTime() < 30 * 24 * 60 * 60 * 1000
}

function assStatusBadge(ass: AssinaturaInfo | null): { label: string; bg: string; color: string } {
  if (!ass) return { label: 'Sem ass.', bg: 'var(--bg-input)', color: 'var(--text-muted)' }
  switch (ass.status) {
    case 'trial':    return { label: 'Trial',    bg: 'rgba(255,171,0,0.12)',  color: '#FFAB00' }
    case 'active':   return { label: 'Ativo',    bg: 'rgba(0,230,118,0.12)',  color: '#00E676' }
    case 'past_due': return { label: 'Atrasado', bg: 'rgba(255,82,82,0.12)',  color: '#FF5252' }
    case 'canceled': return { label: 'Cancelado',bg: 'rgba(255,82,82,0.10)',  color: '#FF5252' }
    case 'expired':  return { label: 'Expirado', bg: 'rgba(100,100,100,0.15)',color: '#6B7280' }
    default:         return { label: ass.status,  bg: 'var(--bg-input)',       color: 'var(--text-muted)' }
  }
}

function assValor(ass: AssinaturaInfo | null): string {
  if (!ass || ass.status !== 'active') return '—'
  if (ass.plano === 'anual') return 'R$249,90/ano'
  return 'R$29,90/mês'
}

function assExpira(ass: AssinaturaInfo | null): string {
  if (!ass) return '—'
  if (ass.status === 'trial') return ass.trial_fim ? `Trial até ${fmtDate(ass.trial_fim)}` : '—'
  if (ass.status === 'active' && ass.periodo_fim) return `Renova ${fmtDate(ass.periodo_fim)}`
  return '—'
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
      <p className="text-2xl font-bold leading-tight" style={{ color: color ?? 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

function BarChart({ data, labels, color = 'rgba(0,230,118,0.4)', accentColor = '#00E676' }: {
  data: number[]; labels: string[]; color?: string; accentColor?: string
}) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{v > 0 ? v : ''}</span>
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.max((v / max) * 100, v > 0 ? 8 : 2)}%`,
              background: i === data.length - 1 ? accentColor : color,
              minHeight: 2,
              transition: 'height 0.3s ease',
            }}
          />
          <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── ProfessorDetailModal ─────────────────────────────────────────────────────

function ProfessorDetailModal({
  professor,
  onClose,
  onToggleBlock,
  onCancelarAssinatura,
}: {
  professor: ProfessorRow
  onClose: () => void
  onToggleBlock: (id: string, blocked: boolean) => Promise<void>
  onCancelarAssinatura: (professorId: string, subId: string | null) => Promise<void>
}) {
  const [blocking,    setBlocking]    = useState(false)
  const [canceling,   setCanceling]   = useState(false)
  const [confirmCanc, setConfirmCanc] = useState(false)
  const active = isActive(professor.last_sign_in_at)
  const ass    = professor.assinatura
  const badge  = assStatusBadge(ass)

  async function handleBlock() {
    setBlocking(true)
    await onToggleBlock(professor.id, professor.is_blocked)
    setBlocking(false)
    onClose()
  }

  async function handleCancelar() {
    setCanceling(true)
    await onCancelarAssinatura(professor.id, ass?.stripe_subscription_id ?? null)
    setCanceling(false)
    setConfirmCanc(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Detalhes do Professor</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
              {professor.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{professor.nome}</p>
              <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{professor.email}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {professor.is_blocked ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}>Bloqueado</span>
              ) : active ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>Ativo</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Inativo</span>
              )}
            </div>
          </div>

          {/* Usage stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Cadastro',      value: fmtDate(professor.created_at) },
              { label: 'Último acesso', value: fmtRelative(professor.last_sign_in_at) },
              { label: 'Alunos',        value: professor.aluno_count },
              { label: 'Cobranças',     value: professor.cobranca_count },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Subscription section */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Assinatura</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {ass ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Plano',  value: ass.plano === 'anual' ? 'Anual' : ass.plano === 'mensal' ? 'Mensal' : '—' },
                      { label: 'Valor',  value: assValor(ass) },
                      { label: 'Expira / Renova', value: assExpira(ass) },
                      { label: 'Trial até', value: ass.trial_fim ? fmtDate(ass.trial_fim) : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg p-2.5" style={{ background: 'var(--bg-input)' }}>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stripe links */}
                  <div className="flex flex-col gap-2">
                    {ass.stripe_customer_id && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${ass.stripe_customer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(99,91,255,0.1)', color: '#8B5CF6', border: '1px solid rgba(99,91,255,0.2)', textDecoration: 'none' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Ver no Stripe ({ass.stripe_customer_id.slice(0, 18)}…)
                      </a>
                    )}
                    {ass.stripe_subscription_id && (
                      <a
                        href={`https://dashboard.stripe.com/subscriptions/${ass.stripe_subscription_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(99,91,255,0.07)', color: '#8B5CF6', border: '1px solid rgba(99,91,255,0.15)', textDecoration: 'none' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                          <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        Ver assinatura Stripe
                      </a>
                    )}
                  </div>

                  {/* Cancel button */}
                  {ass.status === 'active' && (
                    confirmCanc ? (
                      <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#FF5252' }}>Cancelar assinatura?</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Isso cancelará no Stripe e marcará como &apos;canceled&apos; no banco. Ação irreversível.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmCanc(false)} className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                            Voltar
                          </button>
                          <button onClick={handleCancelar} disabled={canceling} className="flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer"
                            style={{ background: '#FF5252', color: '#fff', opacity: canceling ? 0.6 : 1 }}>
                            {canceling ? 'Cancelando…' : 'Confirmar cancelamento'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmCanc(true)}
                        className="py-2 rounded-lg text-xs font-medium cursor-pointer"
                        style={{ background: 'rgba(255,82,82,0.08)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.18)' }}
                      >
                        Cancelar assinatura manualmente
                      </button>
                    )
                  )}
                </>
              ) : (
                <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                  Sem registro de assinatura para este professor.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              Fechar
            </button>
            <button
              onClick={handleBlock}
              disabled={blocking}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
              style={professor.is_blocked
                ? { background: 'var(--green-muted)', color: 'var(--green-primary)' }
                : { background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}
            >
              {blocking ? '...' : professor.is_blocked ? '✓ Desbloquear' : '⊘ Bloquear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ professors: initialProfessors, stats }: {
  professors: ProfessorRow[]
  stats: AdminStats
}) {
  const [professors,  setProfessors]  = useState(initialProfessors)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState<FilterStatus>('todos')
  const [assFilter,   setAssFilter]   = useState<AssFilter>('todos')
  const [selected,    setSelected]    = useState<ProfessorRow | null>(null)
  const [tab,         setTab]         = useState<'professores' | 'metricas'>('professores')
  const [isPending,   startTransition] = useTransition()

  // ── filter + search ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return professors.filter(p => {
      const matchSearch = !q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
      if (!matchSearch) return false
      if (filter === 'ativos')     return !p.is_blocked && isActive(p.last_sign_in_at)
      if (filter === 'inativos')   return !p.is_blocked && !isActive(p.last_sign_in_at)
      if (filter === 'bloqueados') return p.is_blocked
      if (assFilter === 'trial')   return p.assinatura?.status === 'trial'
      if (assFilter === 'active')  return p.assinatura?.status === 'active'
      if (assFilter === 'canceled')return p.assinatura?.status === 'canceled' || p.assinatura?.status === 'expired'
      if (assFilter === 'sem')     return !p.assinatura
      return true
    })
  }, [professors, search, filter, assFilter])

  // ── block/unblock ────────────────────────────────────────────────────────
  async function handleToggleBlock(id: string, currentlyBlocked: boolean) {
    startTransition(async () => {
      const res = await toggleBlockAction(id, currentlyBlocked)
      if (res.error) { alert(`Erro: ${res.error}`); return }
      setProfessors(prev => prev.map(p =>
        p.id === id ? { ...p, is_blocked: !currentlyBlocked } : p
      ))
    })
  }

  // ── cancel subscription ──────────────────────────────────────────────────
  async function handleCancelarAssinatura(professorId: string, subId: string | null) {
    const res = await cancelarAssinaturaAdminAction(professorId, subId)
    if (res.error) { alert(`Erro: ${res.error}`); return }
    setProfessors(prev => prev.map(p =>
      p.id === professorId && p.assinatura
        ? { ...p, assinatura: { ...p.assinatura, status: 'canceled' } }
        : p
    ))
  }

  // ── chart labels ─────────────────────────────────────────────────────────
  const chartLabels = Array.from({ length: 8 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (7 - i) * 7)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  })

  const activePct = stats.total_professors > 0
    ? Math.round((stats.active_professors / stats.total_professors) * 100)
    : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 h-14 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Dashboard
          </Link>
          <span style={{ color: 'var(--border-subtle)' }}>/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/notificacoes"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notificações
          </Link>
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
            Painel Administrativo
          </span>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">

        {/* ── Overview cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <StatCard
            label="Total de professores"
            value={stats.total_professors}
            sub="cadastrados"
            icon="👤"
          />
          <StatCard
            label="Em trial"
            value={stats.trials}
            sub="período de teste"
            color="#FFAB00"
            icon="⏳"
          />
          <StatCard
            label="Assinantes ativos"
            value={stats.assinantes}
            sub="pagantes"
            color="#00E676"
            icon="✅"
          />
          <StatCard
            label="MRR"
            value={`R$\u00A0${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            sub="receita mensal recorrente"
            color="#00E676"
            icon="💰"
          />
          <StatCard
            label="Expirados / Cancelados"
            value={stats.expirados}
            sub="sem renovação"
            color="#FF5252"
            icon="❌"
          />
          <StatCard
            label="Conversão"
            value={`${stats.conversao}%`}
            sub="trial → assinante"
            color={stats.conversao >= 20 ? '#00E676' : stats.conversao >= 10 ? '#FFAB00' : '#FF5252'}
            icon="📈"
          />
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {([
            { key: 'professores', label: 'Professores' },
            { key: 'metricas',    label: 'Métricas' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style={tab === t.key
                ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }
                : { color: 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ Tab: Professores ══════════════════════════════════════════════ */}
        {tab === 'professores' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou email..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {/* Status filters */}
                {(['todos','ativos','inativos','bloqueados'] as FilterStatus[]).map(f => (
                  <button key={f} onClick={() => { setFilter(f); setAssFilter('todos') }}
                    className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer capitalize"
                    style={filter === f && assFilter === 'todos'
                      ? { background: 'var(--green-primary)', color: '#000' }
                      : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {f}
                  </button>
                ))}
                <div style={{ width: 1, background: 'var(--border-subtle)', margin: '2px 4px' }} />
                {/* Assinatura filters */}
                {([
                  { key: 'trial',    label: 'Trial' },
                  { key: 'active',   label: 'Assinantes' },
                  { key: 'canceled', label: 'Cancelados' },
                  { key: 'sem',      label: 'Sem ass.' },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => { setAssFilter(f.key); setFilter('todos') }}
                    className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                    style={assFilter === f.key
                      ? { background: '#7C3AED', color: '#fff' }
                      : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table — desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Nome', 'Email', 'Cadastro', 'Alunos', 'Assinatura', 'Plano', 'Expira', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      Nenhum professor encontrado
                    </td></tr>
                  )}
                  {filtered.map(p => {
                    const active = isActive(p.last_sign_in_at)
                    const badge  = assStatusBadge(p.assinatura)
                    return (
                      <tr key={p.id} className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onClick={() => setSelected(p)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                              {p.nome.slice(0,2).toUpperCase()}
                            </div>
                            <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{p.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{fmtDate(p.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: p.aluno_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {p.aluno_count}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {p.assinatura?.plano === 'anual' ? 'Anual' : p.assinatura?.plano === 'mensal' ? 'Mensal' : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {assExpira(p.assinatura)}
                        </td>
                        <td className="px-4 py-3">
                          {p.is_blocked ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}>Bloqueado</span>
                          ) : active ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>Ativo</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Inativo</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); void handleToggleBlock(p.id, p.is_blocked) }}
                            disabled={isPending}
                            className="text-xs px-3 py-1 rounded-lg cursor-pointer disabled:opacity-40"
                            style={p.is_blocked
                              ? { background: 'var(--green-muted)', color: 'var(--green-primary)' }
                              : { background: 'rgba(255,82,82,0.1)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.2)' }}>
                            {p.is_blocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile */}
            <div className="md:hidden flex flex-col divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum professor encontrado</p>
              )}
              {filtered.map(p => {
                const active = isActive(p.last_sign_in_at)
                const badge  = assStatusBadge(p.assinatura)
                return (
                  <div key={p.id} className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setSelected(p)}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                      {p.nome.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.nome}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.email}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.aluno_count} alunos · {fmtRelative(p.last_sign_in_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      {p.is_blocked ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}>Bloq.</span>
                      ) : active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>Ativo</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Inativo</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer count */}
            <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              {filtered.length} de {professors.length} professores
            </div>
          </div>
        )}

        {/* ══ Tab: Métricas ════════════════════════════════════════════════ */}
        {tab === 'metricas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Novos cadastros */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>📈 Novos cadastros por semana</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Últimas 8 semanas</p>
              <BarChart data={stats.weekly_signups} labels={chartLabels} />
              <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{stats.weekly_signups.reduce((a,b)=>a+b,0)}</strong></span>
                <span>Essa semana: <strong style={{ color: '#00E676' }}>{stats.weekly_signups[7]}</strong></span>
              </div>
            </div>

            {/* Conversão trial → assinante */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>🔄 Conversão Trial → Assinante</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Assinantes ativos por semana de cadastro</p>
              <BarChart data={stats.conversion_data} labels={chartLabels} color="rgba(139,92,246,0.35)" accentColor="#8B5CF6" />
              <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Total convertidos: <strong style={{ color: '#8B5CF6' }}>{stats.assinantes}</strong></span>
                <span>Taxa: <strong style={{ color: '#8B5CF6' }}>{stats.conversao}%</strong></span>
              </div>
            </div>

            {/* Funil de assinatura */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>💳 Funil de Assinatura</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Distribuição por status</p>
              {[
                { label: 'Sem registro',      count: stats.sem_assinatura, color: 'var(--text-muted)' },
                { label: 'Trial ativo',       count: stats.trials,         color: '#FFAB00' },
                { label: 'Assinante ativo',   count: stats.assinantes,     color: '#00E676' },
                { label: 'Expirado/Cancelado',count: stats.expirados,      color: '#FF5252' },
              ].map(({ label, count, color }) => {
                const pct = stats.total_professors > 0 ? Math.round((count / stats.total_professors) * 100) : 0
                return (
                  <div key={label} className="flex items-center gap-3 mb-3">
                    <span className="text-xs w-36 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, minWidth: pct > 0 ? 4 : 0, transition: 'width 0.5s ease' }} />
                    </div>
                    <span className="text-xs w-14 text-right" style={{ color: 'var(--text-secondary)' }}>{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>

            {/* Engajamento + MRR */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>⚡ Métricas de Receita</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Dados financeiros em tempo real</p>
              {[
                { label: 'MRR atual',          value: `R$ ${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,  color: '#00E676' },
                { label: 'ARR projetado',      value: `R$ ${(stats.mrr * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#00E676' },
                { label: 'Assinantes ativos',  value: stats.assinantes,   color: '#00E676' },
                { label: 'Em trial',           value: stats.trials,       color: '#FFAB00' },
                { label: 'Expirados',          value: stats.expirados,    color: '#FF5252' },
                { label: 'Professores ativos (30d)', value: stats.active_professors, color: 'var(--text-secondary)' },
                { label: 'Com alunos',         value: professors.filter(p => p.aluno_count > 0).length, color: '#40C4FF' },
                { label: 'Bloqueados',         value: professors.filter(p => p.is_blocked).length, color: '#FF5252' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* ── Professor detail modal ────────────────────────────────────────── */}
      {selected && (
        <ProfessorDetailModal
          professor={selected}
          onClose={() => setSelected(null)}
          onToggleBlock={handleToggleBlock}
          onCancelarAssinatura={handleCancelarAssinatura}
        />
      )}
    </div>
  )
}
