'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/types/aluno'
import { saveMetaAction } from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

interface AulaHoje {
  alunoId: string
  alunoNome: string
  horario: string
  local: string
  tipo: 'regular' | 'reposicao'
}

interface Reposicao {
  id: string
  alunoId: string
  alunoNome: string
  dataFalta: string
  prazo: string
  diasRestantes: number
  culpa: 'aluno' | 'professor'
}

interface Aniversario {
  id: string
  nome: string
  dia: number
  diasRestantes: number
}

interface Props {
  professorNome: string
  faturamento: number
  lucro: number
  margem: number
  custoTotal: number
  cobrancasPagas: number
  cobrancasTotal: number
  totalAlunos: number
  aulasHoje: AulaHoje[]
  reposicoesPendentes: Reposicao[]
  aniversarios: Aniversario[]
  alunos: { id: string; nome: string }[]
  metaMensal: number | null
  mediaValorAluno: number
  mesRef: string
}

// ─── greeting helper ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0]
}

// ─── MetaModal ────────────────────────────────────────────────────────────────

function MetaModal({
  current,
  onClose,
  onSave,
}: {
  current: number | null
  onClose: () => void
  onSave: (v: number) => void
}) {
  const [value, setValue] = useState(current ? String(current) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const v = parseFloat(value.replace(',', '.'))
    if (isNaN(v) || v <= 0) { setError('Informe um valor válido.'); return }
    setLoading(true)
    const res = await saveMetaAction(v)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSave(v)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Meta Mensal
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Defina o faturamento que quer atingir este mês.
        </p>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex: 5000"
          value={value}
          onChange={e => { setValue(e.target.value); setError('') }}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          autoFocus
        />
        {error && <p className="text-xs mt-1.5" style={{ color: '#FF5252' }}>{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--green-primary)', color: '#000' }}
          >
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── component ───────────────────────────────────────────────────────────────

export function DashboardHome({
  professorNome,
  faturamento,
  lucro,
  margem,
  custoTotal,
  cobrancasPagas,
  cobrancasTotal,
  totalAlunos,
  aulasHoje,
  reposicoesPendentes,
  aniversarios,
  alunos,
  metaMensal: metaMensalInit,
  mediaValorAluno,
  mesRef,
}: Props) {
  const [metaMensal, setMetaMensal] = useState<number | null>(metaMensalInit)
  const [showMetaModal, setShowMetaModal] = useState(false)

  const metaProgress = metaMensal && metaMensal > 0
    ? Math.min(Math.round((faturamento / metaMensal) * 100), 100)
    : 0

  const alunosParaMeta = metaMensal && mediaValorAluno > 0
    ? Math.max(0, Math.ceil((metaMensal - faturamento) / mediaValorAluno))
    : 0

  const [mesAno] = mesRef.split('-').map(Number)
  const mesNome = new Date(mesAno, (Number(mesRef.split('-')[1]) - 1), 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // margin color
  const margemColor = margem >= 50 ? '#00E676' : margem >= 30 ? '#FFAB00' : '#FF5252'

  // recebimentos color
  const recebPct = cobrancasTotal > 0
    ? Math.round((cobrancasPagas / cobrancasTotal) * 100)
    : 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* ── Greeting ────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {getGreeting()}, {getFirstName(professorNome)}! 👋
        </h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
          {mesNome}
        </p>
      </div>

      {/* ── Quick shortcuts ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { href: '/dashboard/financeiro?tab=cobranca', icon: '💰', label: 'Cobrança' },
          { href: '/dashboard/agenda',                  icon: '📅', label: 'Agenda' },
          { href: '/dashboard/alunos?tab=novo',         icon: '➕', label: 'Novo Aluno' },
          { href: '/dashboard/financeiro',              icon: '📊', label: 'Financeiro' },
        ].map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <span className="text-xl">{s.icon}</span>
            <span className="text-xs font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
              {s.label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Metric cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">

        {/* Faturamento */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Faturamento</p>
          <p className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(faturamento)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Bruto do mês</p>
        </div>

        {/* Lucro */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Lucro Líquido</p>
          <p
            className="text-lg font-bold leading-tight"
            style={{ color: lucro >= 0 ? 'var(--green-primary)' : '#FF5252' }}
          >
            {formatCurrency(lucro)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Custos: {formatCurrency(custoTotal)}
          </p>
        </div>

        {/* Recebimentos */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Recebimentos</p>
          <p className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {cobrancasPagas}<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/{cobrancasTotal > 0 ? cobrancasTotal : totalAlunos}</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${cobrancasTotal > 0 ? recebPct : 0}%`,
                background: 'var(--green-primary)',
              }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {cobrancasTotal > 0 ? `${recebPct}% pagos` : 'Sem cobranças'}
          </p>
        </div>

        {/* Margem */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Margem</p>
          <p className="text-lg font-bold leading-tight" style={{ color: margemColor }}>
            {margem}%
          </p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(margem, 100))}%`, background: margemColor }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {margem >= 50 ? 'Ótima' : margem >= 30 ? 'Regular' : faturamento > 0 ? 'Baixa' : '—'}
          </p>
        </div>
      </div>

      {/* ── Meta financeira ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            🎯 Meta do mês
          </p>
          <button
            onClick={() => setShowMetaModal(true)}
            className="text-xs px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--bg-input)', color: 'var(--green-primary)' }}
          >
            {metaMensal ? 'Editar' : 'Definir meta'}
          </button>
        </div>

        {metaMensal ? (
          <>
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-xl font-bold" style={{ color: 'var(--green-primary)' }}>
                  {formatCurrency(faturamento)}
                </span>
                <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
                  / {formatCurrency(metaMensal)}
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: metaProgress >= 100 ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                {metaProgress}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-input)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${metaProgress}%`,
                  background: metaProgress >= 100 ? 'var(--green-primary)' : '#FFAB00',
                }}
              />
            </div>
            {metaProgress < 100 && mediaValorAluno > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Faltam {formatCurrency(metaMensal - faturamento)} •{' '}
                {alunosParaMeta === 1
                  ? '+1 aluno novo para bater a meta'
                  : alunosParaMeta > 1
                    ? `+${alunosParaMeta} alunos novos para bater a meta`
                    : 'Meta quase atingida!'}
              </p>
            )}
            {metaProgress >= 100 && (
              <p className="text-xs font-semibold" style={{ color: 'var(--green-primary)' }}>
                🎉 Meta atingida! Parabéns!
              </p>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Defina uma meta para acompanhar seu progresso financeiro.
          </p>
        )}
      </div>

      {/* ── 2-col layout for Aulas + Reposições ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        {/* Aulas de hoje */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              📋 Aulas de hoje
            </p>
            {aulasHoje.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
              >
                {aulasHoje.length}
              </span>
            )}
          </div>
          {aulasHoje.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma aula hoje.</p>
          ) : (
            <div className="space-y-2">
              {aulasHoje.map((a, i) => (
                <Link
                  key={`${a.alunoId}-${i}`}
                  href={`/dashboard/alunos/${a.alunoId}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'var(--bg-input)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
                  >
                    {a.alunoNome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {a.alunoNome}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {a.horario || '—'} · {a.local || '—'}
                    </p>
                  </div>
                  {a.tipo === 'reposicao' && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: 'rgba(255,171,0,0.15)', color: '#FFAB00' }}
                    >
                      Repo
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Reposições pendentes */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              ⏰ Reposições pendentes
            </p>
            {reposicoesPendentes.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(255,171,0,0.15)', color: '#FFAB00' }}
              >
                {reposicoesPendentes.length}
              </span>
            )}
          </div>
          {reposicoesPendentes.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma reposição pendente.</p>
          ) : (
            <div className="space-y-2">
              {reposicoesPendentes.slice(0, 5).map(r => {
                const urgent = r.diasRestantes <= 3
                const expired = r.diasRestantes < 0
                const color = expired ? '#FF5252' : urgent ? '#FFAB00' : 'var(--text-muted)'
                return (
                  <Link
                    key={r.id}
                    href="/dashboard/agenda?tab=faltas"
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: 'var(--bg-input)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'rgba(255,171,0,0.12)', color: '#FFAB00' }}
                    >
                      {r.alunoNome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {r.alunoNome}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Falta em {formatDate(r.dataFalta)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color }}>
                      {expired
                        ? 'Vencida'
                        : r.diasRestantes === 0
                          ? 'Hoje!'
                          : `${r.diasRestantes}d`}
                    </span>
                  </Link>
                )
              })}
              {reposicoesPendentes.length > 5 && (
                <Link
                  href="/dashboard/agenda?tab=faltas"
                  className="block text-center text-xs py-2"
                  style={{ color: 'var(--green-primary)' }}
                >
                  Ver todas ({reposicoesPendentes.length})
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Aniversários do mês ───────────────────────────────────────────── */}
      {aniversarios.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            🎂 Aniversários do mês
          </p>
          <div className="flex flex-wrap gap-2">
            {aniversarios.map(a => {
              const hoje = a.diasRestantes === 0
              const passou = a.diasRestantes < 0
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/alunos/${a.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: hoje ? 'var(--green-muted)' : 'var(--bg-input)',
                    border: hoje ? '1px solid var(--green-primary)' : '1px solid transparent',
                  }}
                >
                  <span>{hoje ? '🎉' : '🎂'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{a.nome}</span>
                  <span
                    className="text-xs"
                    style={{ color: hoje ? 'var(--green-primary)' : passou ? 'var(--text-muted)' : 'var(--text-muted)' }}
                  >
                    {hoje ? 'Hoje!' : passou ? `dia ${a.dia}` : `dia ${a.dia} (${a.diasRestantes}d)`}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Alunos ativos ─────────────────────────────────────────────────── */}
      {alunos.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              👥 Alunos ativos
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
            >
              {alunos.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alunos.map(a => (
              <Link
                key={a.id}
                href={`/dashboard/alunos/${a.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
                >
                  {a.nome.charAt(0).toUpperCase()}
                </span>
                {a.nome.split(' ')[0]}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Meta modal ────────────────────────────────────────────────────── */}
      {showMetaModal && (
        <MetaModal
          current={metaMensal}
          onClose={() => setShowMetaModal(false)}
          onSave={v => { setMetaMensal(v); setShowMetaModal(false) }}
        />
      )}
    </div>
  )
}
