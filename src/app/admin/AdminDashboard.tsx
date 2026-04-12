'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { toggleBlockAction } from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

export interface ProfessorRow {
  id: string
  email: string
  nome: string
  created_at: string
  last_sign_in_at: string | null
  is_blocked: boolean
  aluno_count: number
  cobranca_count: number
}

export interface AdminStats {
  total_professors: number
  active_professors: number
  total_alunos: number
  weekly_signups: number[]  // 8 values, oldest → newest
}

type FilterStatus = 'todos' | 'ativos' | 'inativos' | 'bloqueados'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`
  return `${Math.floor(days / 365)} anos atrás`
}

function isActive(lastSignIn: string | null): boolean {
  if (!lastSignIn) return false
  return Date.now() - new Date(lastSignIn).getTime() < 30 * 24 * 60 * 60 * 1000
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold leading-tight" style={{ color: color ?? 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{v > 0 ? v : ''}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${Math.max((v / max) * 100, v > 0 ? 8 : 2)}%`,
              background: i === data.length - 1 ? 'var(--green-primary)' : 'rgba(0,230,118,0.3)',
              minHeight: 2,
            }}
          />
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{labels[i]}</span>
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
}: {
  professor: ProfessorRow
  onClose: () => void
  onToggleBlock: (id: string, blocked: boolean) => Promise<void>
}) {
  const [blocking, setBlocking] = useState(false)
  const active = isActive(professor.last_sign_in_at)

  async function handleBlock() {
    setBlocking(true)
    await onToggleBlock(professor.id, professor.is_blocked)
    setBlocking(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Detalhes do Professor</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
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
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{professor.nome}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{professor.email}</p>
            </div>
            <div className="ml-auto">
              {professor.is_blocked ? (
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}>Bloqueado</span>
              ) : active ? (
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>Ativo</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Inativo</span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Cadastro',    value: fmtDate(professor.created_at) },
              { label: 'Último acesso', value: fmtRelative(professor.last_sign_in_at) },
              { label: 'Alunos',      value: professor.aluno_count },
              { label: 'Cobranças',   value: professor.cobranca_count },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
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
  const [professors, setProfessors] = useState(initialProfessors)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<FilterStatus>('todos')
  const [selected, setSelected]     = useState<ProfessorRow | null>(null)
  const [tab, setTab]               = useState<'professores' | 'metricas'>('professores')
  const [isPending, startTransition] = useTransition()

  // ── filter + search ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return professors.filter((p) => {
      const matchSearch = !q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
      if (!matchSearch) return false
      if (filter === 'ativos')     return !p.is_blocked && isActive(p.last_sign_in_at)
      if (filter === 'inativos')   return !p.is_blocked && !isActive(p.last_sign_in_at)
      if (filter === 'bloqueados') return p.is_blocked
      return true
    })
  }, [professors, search, filter])

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

  // ── chart labels (last 8 weeks) ──────────────────────────────────────────
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

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
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
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
          Painel Administrativo
        </span>
      </div>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">

        {/* ── Overview cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total de Professores" value={stats.total_professors} sub="cadastrados" />
          <StatCard
            label="Professores Ativos"
            value={stats.active_professors}
            sub={`${activePct}% — últimos 30 dias`}
            color="var(--green-primary)"
          />
          <StatCard label="Total de Alunos" value={stats.total_alunos} sub="em todos os perfis" />
          <StatCard
            label="Receita Estimada"
            value={`R$ ${(stats.total_professors * 49.9).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            sub="@ R$ 49,90/professor"
            color="#FFAB00"
          />
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
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
              <div className="flex gap-1">
                {(['todos','ativos','inativos','bloqueados'] as FilterStatus[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer capitalize"
                    style={filter === f
                      ? { background: 'var(--green-primary)', color: '#000' }
                      : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Table — desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Nome', 'Email', 'Cadastro', 'Alunos', 'Último acesso', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Nenhum professor encontrado
                      </td>
                    </tr>
                  )}
                  {filtered.map(p => {
                    const active = isActive(p.last_sign_in_at)
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
                        <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{fmtDate(p.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: p.aluno_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {p.aluno_count}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{fmtRelative(p.last_sign_in_at)}</td>
                        <td className="px-4 py-3">
                          {p.is_blocked ? (
                            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}>Bloqueado</span>
                          ) : active ? (
                            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>Ativo</span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Inativo</span>
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
                return (
                  <div key={p.id} className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => setSelected(p)}>
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
                    {p.is_blocked ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0" style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}>Bloq.</span>
                    ) : active ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>Ativo</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Inativo</span>
                    )}
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

            {/* Novos cadastros por semana */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                📈 Novos cadastros por semana
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Últimas 8 semanas</p>
              <BarChart data={stats.weekly_signups} labels={chartLabels} />
              <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{stats.weekly_signups.reduce((a,b)=>a+b,0)}</strong> novos</span>
                <span>Essa semana: <strong style={{ color: 'var(--green-primary)' }}>{stats.weekly_signups[7]}</strong></span>
              </div>
            </div>

            {/* Distribuição de alunos */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                👥 Distribuição de alunos
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Por professor</p>
              {[
                { label: '0 alunos',   count: professors.filter(p => p.aluno_count === 0).length },
                { label: '1–5 alunos', count: professors.filter(p => p.aluno_count >= 1 && p.aluno_count <= 5).length },
                { label: '6–10 alunos',count: professors.filter(p => p.aluno_count >= 6 && p.aluno_count <= 10).length },
                { label: '11+ alunos', count: professors.filter(p => p.aluno_count >= 11).length },
              ].map(({ label, count }) => {
                const pct = professors.length > 0 ? Math.round((count / professors.length) * 100) : 0
                return (
                  <div key={label} className="flex items-center gap-3 mb-2">
                    <span className="text-xs w-20 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--green-primary)', minWidth: pct > 0 ? 4 : 0 }} />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: 'var(--text-secondary)' }}>{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Engajamento */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                ⚡ Engajamento
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Atividade dos professores</p>
              {[
                { label: 'Ativos (30d)',   value: stats.active_professors, color: 'var(--green-primary)' },
                { label: 'Com alunos',     value: professors.filter(p => p.aluno_count > 0).length, color: '#40C4FF' },
                { label: 'Com cobranças',  value: professors.filter(p => p.cobranca_count > 0).length, color: '#FFAB00' },
                { label: 'Bloqueados',     value: professors.filter(p => p.is_blocked).length, color: '#FF5252' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Stripe placeholder */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                💳 Assinaturas Stripe
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Conectar quando disponível</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Trial ativo', value: '—' },
                  { label: 'Assinantes',  value: '—' },
                  { label: 'Churn rate',  value: '—' },
                  { label: 'MRR',         value: '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                🔌 Integração Stripe pendente
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Professor detail modal ─────────────────────────────────────── */}
      {selected && (
        <ProfessorDetailModal
          professor={selected}
          onClose={() => setSelected(null)}
          onToggleBlock={handleToggleBlock}
        />
      )}
    </div>
  )
}
