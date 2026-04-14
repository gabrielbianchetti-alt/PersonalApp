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
  dia_cobranca: number
  cobrancaId: string | null
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

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(n: string): string { return n.split(' ')[0] }

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
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
  const pagosCount    = alunosCobranca.filter(a => a.status === 'pago').length
  const naoPagosCount = alunosCobranca.filter(a => a.status !== 'pago').length

  // Unpaid only for the dashboard list (sorted: pendente → enviado)
  const pendingAlunos = [...alunosCobranca]
    .filter(a => a.status !== 'pago')
    .sort((a, b) => {
      const order: Record<CobrancaStatus, number> = { pendente: 0, enviado: 1, pago: 2 }
      return order[a.status] - order[b.status]
    })

  // Determine "Próxima" aula index
  const nowMin      = new Date().getHours() * 60 + new Date().getMinutes()
  const proximaIdx  = aulasHoje.findIndex(a => a.horario && timeToMin(a.horario) >= nowMin)

  // Financial
  const margemColor = margem >= 50 ? '#00E676' : margem >= 30 ? '#FFAB00' : '#FF5252'

  // Month name
  const [mesAno, mesMes] = mesRef.split('-').map(Number)
  const mesNome = new Date(mesAno, mesMes - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Today date string
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  async function handleMarcarPago(alunoId: string) {
    const aluno = alunosCobranca.find(a => a.alunoId === alunoId)
    if (!aluno) return
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
    const phone     = raw.length === 11 ? `55${raw}` : raw
    const firstName = a.alunoNome.split(' ')[0]
    const msg = `Olá ${firstName}! Passando para lembrar que a mensalidade de ${formatCurrency(a.valor)} referente a ${mesNome} ainda está pendente. Obrigado! 😊`
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
  }

  // ── card style helper ─────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 20,
    padding: '18px 20px',
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── ATALHOS — mobile only ────────────────────────────────────────── */}
      <div className="md:hidden grid grid-cols-4 gap-2">
        {[
          { href: '/dashboard/financeiro?tab=cobranca', icon: '💰', label: 'Cobrança' },
          { href: '/dashboard/agenda',                  icon: '📅', label: 'Agenda' },
          { href: '/dashboard/alunos?tab=novo',         icon: '➕', label: 'Novo Aluno' },
          { href: '/dashboard/financeiro',              icon: '📊', label: 'Financeiro' },
        ].map(s => (
          <Link key={s.href} href={s.href}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <span className="text-xl">{s.icon}</span>
            <span className="text-xs font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
              {s.label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── BLOCO 1 — Compromissos do dia ────────────────────────────────── */}
      <div style={card}>

        {/* Saudação */}
        <div className="mb-4">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {getGreeting()}, {getFirstName(professorNome)}! 👋
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
            {todayLabel}
          </p>
        </div>

        {/* Aulas */}
        {aulasHoje.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma aula hoje. Aproveite o descanso! 😎
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {aulasHoje.map((a, i) => {
              const isProxima = i === proximaIdx
              return (
                <Link key={`${a.alunoId}-${i}`} href={`/dashboard/alunos/${a.alunoId}`}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: isProxima ? 'rgba(0,230,118,0.07)' : 'var(--bg-input)',
                           border: isProxima ? '1px solid rgba(0,230,118,0.25)' : '1px solid transparent' }}>
                  {/* Time */}
                  <div className="shrink-0 text-center" style={{ minWidth: 44 }}>
                    <p className="text-sm font-bold" style={{ color: isProxima ? 'var(--green-primary)' : 'var(--text-primary)' }}>
                      {a.horario || '—'}
                    </p>
                  </div>
                  {/* Divider */}
                  <div className="w-px self-stretch shrink-0"
                    style={{ background: isProxima ? 'rgba(0,230,118,0.4)' : 'var(--border-subtle)' }} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {a.alunoNome}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {a.local || '—'}
                    </p>
                  </div>
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isProxima && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                        Próxima
                      </span>
                    )}
                    {a.tipo === 'reposicao' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(64,196,255,0.12)', color: '#40C4FF' }}>
                        Repo
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── BLOCO 2 — Atenção necessária ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Cobranças pendentes */}
        <div style={card}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              💰 Cobranças
            </p>
            <Link href="/dashboard/financeiro?tab=cobranca"
              className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ver tudo →
            </Link>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {pagosCount} de {totalAlunos} pago{totalAlunos !== 1 ? 's' : ''}
            {/* Progress dots */}
            <span className="ml-2 inline-flex gap-0.5 align-middle">
              {Array.from({ length: Math.min(totalAlunos, 12) }, (_, i) => (
                <span key={i} className="inline-block rounded-full"
                  style={{
                    width: 6, height: 6,
                    background: i < pagosCount ? 'var(--green-primary)' : 'var(--bg-input)',
                  }} />
              ))}
              {totalAlunos > 12 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{totalAlunos - 12}</span>}
            </span>
          </p>

          {naoPagosCount === 0 ? (
            <p className="text-sm py-2" style={{ color: 'var(--green-primary)' }}>
              Todos em dia! ✅
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingAlunos.map(a => {
                const whatsUrl = buildWhatsApp(a)
                const isEnviado = a.status === 'enviado'
                const today = new Date()
                const dueDiff = (a.dia_cobranca || 1) - today.getDate()
                const isOverdue = dueDiff < 0
                const isDueToday = dueDiff === 0
                return (
                  <div key={a.alunoId}
                    className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: 'var(--bg-input)', border: isOverdue ? '1px solid rgba(255,82,82,0.25)' : 'none' }}>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: isEnviado ? 'rgba(64,196,255,0.12)' : 'rgba(255,171,0,0.12)',
                               color: isEnviado ? '#40C4FF' : '#FFAB00' }}>
                      {a.alunoNome.slice(0, 2).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.alunoNome.split(' ')[0]}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(a.valor)}
                        {isEnviado && a.diasDesdeEnvio !== null && a.diasDesdeEnvio > 0
                          ? ` · há ${a.diasDesdeEnvio}d`
                          : isEnviado ? ' · enviado' : ''}
                        {isOverdue
                          ? <span style={{ color: '#FF5252', fontWeight: 600 }}> · atrasado {Math.abs(dueDiff)}d</span>
                          : isDueToday
                          ? <span style={{ color: '#FFAB00', fontWeight: 600 }}> · vence hoje</span>
                          : <span style={{ color: 'var(--text-muted)' }}> · vence dia {a.dia_cobranca || 1}</span>
                        }
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      {whatsUrl !== '#' && (
                        <a href={whatsUrl} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                          style={{ background: 'rgba(0,230,118,0.10)', color: 'var(--green-primary)',
                                   border: '1px solid rgba(0,230,118,0.2)' }}>
                          Cobrar
                        </a>
                      )}
                      <button onClick={() => handleMarcarPago(a.alunoId)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)',
                                 border: '1px solid var(--border-subtle)' }}>
                        Pago ✓
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Reposições pendentes */}
        <div style={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              ⏰ Reposições pendentes
            </p>
            {reposicoesPendentes.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(255,171,0,0.15)', color: '#FFAB00' }}>
                {reposicoesPendentes.length}
              </span>
            )}
          </div>

          {reposicoesPendentes.length === 0 ? (
            <p className="text-sm py-2" style={{ color: 'var(--green-primary)' }}>
              Nenhuma pendente ✅
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {reposicoesPendentes.slice(0, 6).map(r => {
                const urgent  = r.diasRestantes <= 3
                const expired = r.diasRestantes < 0
                const color   = expired ? '#FF5252' : urgent ? '#FFAB00' : 'var(--text-muted)'
                return (
                  <Link key={r.id} href="/dashboard/agenda?tab=faltas"
                    className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: 'var(--bg-input)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: expired ? 'rgba(255,82,82,0.12)' : 'rgba(255,171,0,0.12)',
                               color: expired ? '#FF5252' : '#FFAB00' }}>
                      {r.alunoNome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {r.alunoNome.split(' ')[0]}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Falta: {formatDate(r.dataFalta)}
                      </p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color }}>
                      {expired ? 'Vencida' : r.diasRestantes === 0 ? 'Hoje!' : `${r.diasRestantes}d`}
                    </span>
                  </Link>
                )
              })}
              {reposicoesPendentes.length > 6 && (
                <Link href="/dashboard/agenda?tab=faltas"
                  className="text-center text-xs py-1.5"
                  style={{ color: 'var(--green-primary)' }}>
                  Ver todas ({reposicoesPendentes.length}) →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BLOCO 3 — Financeiro ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">

        {/* Faturamento */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Faturamento</p>
          <p className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(faturamento)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Bruto do mês</p>
        </div>

        {/* Lucro */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Lucro</p>
          <p className="text-base font-bold leading-tight"
            style={{ color: lucro >= 0 ? 'var(--green-primary)' : '#FF5252' }}>
            {formatCurrency(lucro)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Custos: {formatCurrency(custoTotal)}
          </p>
        </div>

        {/* Margem */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Margem</p>
          <p className="text-base font-bold leading-tight" style={{ color: margemColor }}>
            {margem}%
          </p>
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(margem, 100))}%`, background: margemColor }} />
          </div>
        </div>
      </div>

      {/* ── BLOCO 4 — Informações ─────────────────────────────────────────── */}
      {(aniversarios.length > 0 || alunos.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Aniversários */}
          {aniversarios.length > 0 && (
            <div style={card}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                🎂 Aniversários do mês
              </p>
              <div className="flex flex-wrap gap-2">
                {aniversarios.map(a => {
                  const hoje  = a.diasRestantes === 0
                  const passou = a.diasRestantes < 0
                  return (
                    <Link key={a.id} href={`/dashboard/alunos/${a.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                      style={{
                        background: hoje ? 'var(--green-muted)' : 'var(--bg-input)',
                        border: hoje ? '1px solid rgba(0,230,118,0.4)' : '1px solid transparent',
                      }}>
                      <span>{hoje ? '🎉' : '🎂'}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{a.nome.split(' ')[0]}</span>
                      <span className="text-xs"
                        style={{ color: hoje ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                        {hoje ? 'Hoje!' : passou ? `dia ${a.dia}` : `dia ${a.dia} · ${a.diasRestantes}d`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Alunos ativos */}
          {alunos.length > 0 && (
            <div style={card}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  👥 Alunos ativos
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                  {alunos.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {alunos.map(a => (
                  <Link key={a.id} href={`/dashboard/alunos/${a.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                      {a.nome.charAt(0).toUpperCase()}
                    </span>
                    {a.nome.split(' ')[0]}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
