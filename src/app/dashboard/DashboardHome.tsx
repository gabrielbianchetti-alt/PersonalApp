'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/types/aluno'
import { upsertCobrancaPagoAction, desfazerPagoAction } from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

interface AulaHoje {
  alunoId:   string
  alunoNome: string
  horario:   string
  local:     string
  tipo:      'regular' | 'reposicao' | 'aula_extra'
}

type CobrancaStatus = 'pendente' | 'enviado' | 'pago'

interface AlunoCobranca {
  alunoId:       string
  alunoNome:     string
  whatsapp:      string | null
  valor:         number
  dia_cobranca:  number
  cobrancaId:    string | null
  status:        CobrancaStatus
  diasDesdeEnvio: number | null
}

interface Props {
  professorNome: string
  faturamento:   number
  totalAlunos:   number
  aulasHoje:     AulaHoje[]
  todosAlunos:   AlunoCobranca[]
  mesRef:        string
}

// ─── constants ────────────────────────────────────────────────────────────────

const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const TIPO_COLOR: Record<AulaHoje['tipo'], string> = {
  regular:    'var(--green-primary)',
  reposicao:  '#40C4FF',
  aula_extra: '#FFEB3B',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

// ─── component ───────────────────────────────────────────────────────────────

export function DashboardHome({
  professorNome,
  faturamento,
  totalAlunos,
  aulasHoje,
  todosAlunos: todosAlunosInit,
  mesRef,
}: Props) {
  const [alunosCobranca, setAlunosCobranca] = useState<AlunoCobranca[]>(todosAlunosInit)

  // ── real-time clock ───────────────────────────────────────────────────────
  const [clock, setClock] = useState(() => {
    const n = new Date()
    return { h: n.getHours(), m: n.getMinutes() }
  })

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setClock({ h: n.getHours(), m: n.getMinutes() })
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── derived state ─────────────────────────────────────────────────────────
  const nowMin       = clock.h * 60 + clock.m
  const proximaIdx   = aulasHoje.findIndex(a => a.horario && timeToMin(a.horario) >= nowMin)

  const pendingAlunos = [...alunosCobranca]
    .filter(a => a.status !== 'pago')
    .sort((a, b) => {
      const order: Record<CobrancaStatus, number> = { pendente: 0, enviado: 1, pago: 2 }
      return order[a.status] - order[b.status]
    })
  const pagosCount = alunosCobranca.filter(a => a.status === 'pago').length

  // ── date / time display ───────────────────────────────────────────────────
  const today   = new Date()
  const dayNum  = today.getDate()
  const mesAbr  = MESES_ABR[today.getMonth()]
  const timeStr = `${String(clock.h).padStart(2, '0')}:${String(clock.m).padStart(2, '0')}`

  // ── month name for WhatsApp message ──────────────────────────────────────
  const [mesAno, mesMes] = mesRef.split('-').map(Number)
  const mesNome = new Date(mesAno, mesMes - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // ── cobrança handlers ─────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="p-4 md:p-6 flex flex-col"
      style={{ gap: 20, maxWidth: 680, margin: '0 auto', width: '100%' }}
    >

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 1 — DATA + HORA                                       ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="flex items-end justify-between px-1">
        <p
          className="font-black leading-none"
          style={{ fontSize: 'clamp(2.2rem, 7vw, 3rem)', color: 'var(--green-primary)', letterSpacing: '-0.03em' }}
        >
          {dayNum} {mesAbr}
        </p>
        <p
          className="font-black leading-none"
          style={{ fontSize: 'clamp(2.2rem, 7vw, 3rem)', color: 'var(--text-primary)', letterSpacing: '-0.04em' }}
        >
          {timeStr}
        </p>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 2 — TIMELINE DO DIA                                   ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: '20px 20px',
        }}
      >
        {/* Saudação */}
        <p className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {getGreeting()}, {professorNome.split(' ')[0]}! 👋
        </p>

        {aulasHoje.length === 0 ? (
          <p className="text-sm py-3" style={{ color: 'var(--text-muted)' }}>
            Nenhum compromisso hoje. Aproveite! 😎
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {aulasHoje.map((aula, i) => {
              const isProxima = i === proximaIdx
              const isPast    = proximaIdx < 0
                ? timeToMin(aula.horario) < nowMin
                : i < proximaIdx
              const cor = TIPO_COLOR[aula.tipo]

              return (
                <Link
                  key={`${aula.alunoId}-${i}`}
                  href="/dashboard/agenda"
                  className="flex items-center rounded-xl transition-opacity"
                  style={{
                    gap: 12,
                    padding: isProxima ? '10px 12px' : '8px 12px',
                    background: isProxima ? cor + '15' : 'transparent',
                    border: isProxima ? `1.5px solid ${cor}40` : '1.5px solid transparent',
                    borderLeft: `3px solid ${isProxima ? cor : isPast ? 'var(--border-subtle)' : cor + '55'}`,
                    opacity: isPast ? 0.42 : 1,
                  }}
                >
                  {/* Horário */}
                  <span
                    className="text-sm font-bold shrink-0 tabular-nums"
                    style={{ minWidth: 40, color: isProxima ? cor : 'var(--text-secondary)' }}
                  >
                    {aula.horario || '—'}
                  </span>

                  {/* Aluno + local */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {aula.alunoNome}
                    </p>
                    {aula.local && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {aula.local}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isProxima && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cor + '25', color: cor }}
                      >
                        Próxima
                      </span>
                    )}
                    {aula.tipo === 'reposicao' && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(64,196,255,0.12)', color: '#40C4FF' }}
                      >
                        Repo
                      </span>
                    )}
                    {aula.tipo === 'aula_extra' && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,235,59,0.12)', color: '#FFEB3B' }}
                      >
                        Extra
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 3 — MÉTRICAS (1/3 + 2/3)                             ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 2fr' }}>

        {/* Alunos ativos — 1/3 */}
        <Link
          href="/dashboard/alunos"
          className="rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: '22px 12px',
            gap: 4,
            minHeight: 100,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <p
            className="font-black leading-none"
            style={{ fontSize: 'clamp(2.4rem, 8vw, 3.5rem)', color: 'var(--green-primary)', letterSpacing: '-0.04em' }}
          >
            {totalAlunos}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            alunos ativos
          </p>
        </Link>

        {/* Faturamento — 2/3 */}
        <Link
          href="/dashboard/financeiro"
          className="rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: '22px 16px',
            gap: 4,
            minHeight: 100,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <p
            className="font-black leading-none tracking-tight"
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}
          >
            {formatCurrency(faturamento)}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            faturamento · {MESES_ABR[mesMes - 1]}
          </p>
        </Link>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 4 — COBRANÇAS PENDENTES                               ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: '20px 20px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Cobranças
            </p>
            {pendingAlunos.length > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,171,0,0.15)', color: '#FFAB00' }}
              >
                {pendingAlunos.length} pendente{pendingAlunos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Payment progress */}
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {pagosCount}/{totalAlunos}
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(totalAlunos, 10) }, (_, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full"
                    style={{ width: 6, height: 6, background: i < pagosCount ? 'var(--green-primary)' : 'var(--bg-input)' }}
                  />
                ))}
                {totalAlunos > 10 && (
                  <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-muted)' }}>+{totalAlunos - 10}</span>
                )}
              </div>
            </div>
            <Link
              href="/dashboard/financeiro?tab=cobranca"
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Ver tudo →
            </Link>
          </div>
        </div>

        {/* List */}
        {pendingAlunos.length === 0 ? (
          <div className="flex items-center gap-2 py-3">
            <span className="text-xl">✅</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>
              Todos em dia!
            </p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {pendingAlunos.map(a => {
              const whatsUrl   = buildWhatsApp(a)
              const isEnviado  = a.status === 'enviado'
              const todayDate  = new Date()
              const dueDiff    = (a.dia_cobranca || 1) - todayDate.getDate()
              const isOverdue  = dueDiff < 0
              const isDueToday = dueDiff === 0

              return (
                <div
                  key={a.alunoId}
                  className="flex items-center rounded-xl"
                  style={{
                    gap: 10,
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    border: isOverdue ? '1px solid rgba(255,82,82,0.2)' : '1px solid transparent',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isEnviado ? 'rgba(64,196,255,0.12)' : 'rgba(255,171,0,0.12)',
                      color: isEnviado ? '#40C4FF' : '#FFAB00',
                    }}
                  >
                    {a.alunoNome.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {a.alunoNome.split(' ')[0]}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(a.valor)}
                      {isEnviado && a.diasDesdeEnvio !== null && a.diasDesdeEnvio > 0
                        ? ` · enviado há ${a.diasDesdeEnvio}d`
                        : isEnviado ? ' · enviado'
                        : isOverdue
                        ? <span style={{ color: '#FF5252', fontWeight: 600 }}> · atrasado {Math.abs(dueDiff)}d</span>
                        : isDueToday
                        ? <span style={{ color: '#FFAB00', fontWeight: 600 }}> · vence hoje</span>
                        : ` · vence dia ${a.dia_cobranca || 1}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    {whatsUrl !== '#' && (
                      <a
                        href={whatsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{
                          background: 'rgba(0,230,118,0.10)',
                          color: 'var(--green-primary)',
                          border: '1px solid rgba(0,230,118,0.2)',
                        }}
                      >
                        Cobrar
                      </a>
                    )}
                    <button
                      onClick={() => handleMarcarPago(a.alunoId)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                      style={{
                        background: 'var(--bg-card)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      Pago ✓
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Paid entries (collapsed, undo-able) */}
        {alunosCobranca.filter(a => a.status === 'pago').length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex flex-col" style={{ gap: 4 }}>
              {alunosCobranca.filter(a => a.status === 'pago').map(a => (
                <div
                  key={a.alunoId}
                  className="flex items-center rounded-lg"
                  style={{ gap: 8, padding: '6px 10px', opacity: 0.6 }}
                >
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--green-primary)' }}
                  >
                    ✓
                  </span>
                  <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                    {a.alunoNome.split(' ')[0]}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatCurrency(a.valor)}</span>
                  <button
                    onClick={() => handleDesfazer(a.alunoId)}
                    className="text-[10px] cursor-pointer"
                    style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', padding: 0 }}
                  >
                    desfazer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
