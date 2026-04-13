'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/types/aluno'
import { upsertCobrancaPagoAction, desfazerPagoAction } from './actions'

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

type CobrancaStatus = 'pendente' | 'enviado' | 'pago'

interface AlunoCobranca {
  alunoId: string
  alunoNome: string
  whatsapp: string | null
  valor: number
  cobrancaId: string | null   // null = no record yet
  status: CobrancaStatus
  diasDesdeEnvio: number | null
}

interface Props {
  professorNome: string
  faturamento: number
  lucro: number
  margem: number
  custoTotal: number
  totalAlunos: number
  aulasHoje: AulaHoje[]
  reposicoesPendentes: Reposicao[]
  aniversarios: Aniversario[]
  alunos: { id: string; nome: string }[]
  todosAlunos: AlunoCobranca[]
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

// ─── component ───────────────────────────────────────────────────────────────

export function DashboardHome({
  professorNome,
  faturamento,
  lucro,
  margem,
  custoTotal,
  totalAlunos,
  aulasHoje,
  reposicoesPendentes,
  aniversarios,
  alunos,
  todosAlunos: todosAlunosInit,
  mesRef,
}: Props) {
  const [alunosCobranca, setAlunosCobranca] = useState<AlunoCobranca[]>(todosAlunosInit)

  // Derived counts (live from state)
  const pagosCount   = alunosCobranca.filter(a => a.status === 'pago').length
  const naoPagosCount = alunosCobranca.filter(a => a.status !== 'pago').length
  const recebPct     = totalAlunos > 0 ? Math.round((pagosCount / totalAlunos) * 100) : 0

  // Sorted view: pendente → enviado → pago
  const sortedAlunos = [...alunosCobranca].sort((a, b) => {
    const order: Record<CobrancaStatus, number> = { pendente: 0, enviado: 1, pago: 2 }
    return order[a.status] - order[b.status]
  })

  async function handleMarcarPago(alunoId: string) {
    const aluno = alunosCobranca.find(a => a.alunoId === alunoId)
    if (!aluno) return
    // Optimistic
    setAlunosCobranca(prev => prev.map(a => a.alunoId === alunoId ? { ...a, status: 'pago' } : a))
    const res = await upsertCobrancaPagoAction(alunoId, mesRef, aluno.valor)
    if (res.id) {
      setAlunosCobranca(prev => prev.map(a => a.alunoId === alunoId ? { ...a, cobrancaId: res.id! } : a))
    }
  }

  async function handleDesfazer(alunoId: string) {
    const aluno = alunosCobranca.find(a => a.alunoId === alunoId)
    if (!aluno?.cobrancaId) return
    setAlunosCobranca(prev => prev.map(a => a.alunoId === alunoId ? { ...a, status: 'pendente' } : a))
    await desfazerPagoAction(aluno.cobrancaId)
  }

  function buildWhatsApp(a: AlunoCobranca): string {
    const raw = (a.whatsapp ?? '').replace(/\D/g, '')
    if (!raw) return '#'
    const phone = raw.length === 11 ? `55${raw}` : raw
    const firstName = a.alunoNome.split(' ')[0]
    const msg = `Olá ${firstName}! Passando para lembrar que a mensalidade de ${formatCurrency(a.valor)} referente a ${mesNome} ainda está pendente. Obrigado! 😊`
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
  }

  const [mesAno] = mesRef.split('-').map(Number)
  const mesNome = new Date(mesAno, (Number(mesRef.split('-')[1]) - 1), 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // margin color
  const margemColor = margem >= 50 ? '#00E676' : margem >= 30 ? '#FFAB00' : '#FF5252'

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
            {pagosCount}<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/{totalAlunos}</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${recebPct}%`, background: 'var(--green-primary)' }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {totalAlunos > 0 ? `${recebPct}% pagos` : 'Sem alunos'}
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

      {/* ── Resumo rápido do dia ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <p className="text-sm font-semibold mb-2.5" style={{ color: 'var(--text-primary)' }}>
          ⚡ Resumo do dia
        </p>
        {aulasHoje.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma aula hoje. Aproveite o descanso! 😎
          </p>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Hoje você tem{' '}
            <Link
              href="/dashboard/agenda"
              className="font-semibold"
              style={{ color: 'var(--green-primary)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {aulasHoje.length} aula{aulasHoje.length !== 1 ? 's' : ''}
            </Link>
            {naoPagosCount > 0 && (
              <>
                {reposicoesPendentes.length === 0 ? ' e ' : ', '}
                <Link
                  href="/dashboard/financeiro?tab=cobranca"
                  className="font-semibold"
                  style={{ color: '#FFAB00', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {naoPagosCount} pagamento{naoPagosCount !== 1 ? 's' : ''} pendente{naoPagosCount !== 1 ? 's' : ''}
                </Link>
              </>
            )}
            {reposicoesPendentes.length > 0 && (
              <>
                {' e '}
                <Link
                  href="/dashboard/agenda?tab=faltas"
                  className="font-semibold"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {reposicoesPendentes.length} reposição{reposicoesPendentes.length !== 1 ? 'ões' : ''} pendente{reposicoesPendentes.length !== 1 ? 's' : ''}
                </Link>
              </>
            )}
            .
          </p>
        )}
        {naoPagosCount > 0 && (
          <div className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,171,0,0.08)', border: '1px solid rgba(255,171,0,0.2)' }}>
            <span className="text-sm">⚠️</span>
            <p className="text-xs" style={{ color: '#FFAB00' }}>
              {naoPagosCount} aluno{naoPagosCount !== 1 ? 's' : ''} com pagamento em aberto este mês
            </p>
          </div>
        )}
      </div>

      {/* ── Pagamentos do mês ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            💰 Pagamentos do mês
          </p>
          <div className="flex items-center gap-2">
            {naoPagosCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(255,171,0,0.15)', color: '#FFAB00' }}>
                {naoPagosCount} pendente{naoPagosCount !== 1 ? 's' : ''}
              </span>
            )}
            {naoPagosCount === 0 && totalAlunos > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--green-primary)' }}>
                Todos em dia ✅
              </span>
            )}
          </div>
        </div>

        {totalAlunos === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum aluno ativo.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedAlunos.map(a => {
              const isPago   = a.status === 'pago'
              const whatsUrl = buildWhatsApp(a)
              const avatarBg = isPago
                ? 'rgba(0,230,118,0.12)'
                : a.status === 'enviado'
                  ? 'rgba(64,196,255,0.12)'
                  : 'rgba(255,171,0,0.12)'
              const avatarColor = isPago ? 'var(--green-primary)'
                : a.status === 'enviado' ? '#40C4FF' : '#FFAB00'

              return (
                <div
                  key={a.alunoId}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-input)', opacity: isPago ? 0.75 : 1 }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: avatarBg, color: avatarColor }}
                  >
                    {a.alunoNome.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.alunoNome}
                      </p>
                      {/* Status badge */}
                      <span className="text-[10px] px-1.5 py-px rounded font-medium shrink-0"
                        style={
                          isPago
                            ? { background: 'rgba(0,230,118,0.12)', color: 'var(--green-primary)' }
                            : a.status === 'enviado'
                              ? { background: 'rgba(64,196,255,0.12)', color: '#40C4FF' }
                              : { background: 'rgba(255,171,0,0.12)', color: '#FFAB00' }
                        }>
                        {isPago ? 'Pago ✅' : a.status === 'enviado' ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(a.valor)}
                      {!isPago && a.diasDesdeEnvio !== null && a.diasDesdeEnvio > 0
                        ? ` · há ${a.diasDesdeEnvio}d`
                        : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    {isPago ? (
                      <button
                        onClick={() => handleDesfazer(a.alunoId)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                        style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                      >
                        Desfazer
                      </button>
                    ) : (
                      <>
                        {whatsUrl !== '#' && (
                          <a
                            href={whatsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                            style={{ background: 'rgba(0,230,118,0.10)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}
                          >
                            Cobrar
                          </a>
                        )}
                        <button
                          onClick={() => handleMarcarPago(a.alunoId)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                        >
                          Pago ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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

    </div>
  )
}
