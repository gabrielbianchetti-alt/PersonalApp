'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/types/aluno'
import { upsertCobrancaPagoAction, desfazerPagoAction } from './actions'
import { FaltaQuickActionModal } from './faltas/FaltaQuickActionModal'

// ─── types ────────────────────────────────────────────────────────────────────

interface AlertaItem {
  id:   string
  icon: string
  text: string
  href: string
}

interface AulaHoje {
  alunoId:   string
  alunoNome: string
  horario:   string
  local:     string
  tipo:      'regular' | 'reposicao' | 'aula_extra'
}

type CobrancaStatus = 'pendente' | 'enviado' | 'pago'
type CobrancaTab    = 'pendente' | 'enviado' | 'pago'

interface AlunoCobranca {
  alunoId:        string
  alunoNome:      string
  whatsapp:       string | null
  valor:          number
  dia_cobranca:   number
  cobrancaId:     string | null
  status:         CobrancaStatus
  diasDesdeEnvio: number | null
}

interface Props {
  professorNome:         string
  faturamento:           number
  totalAlunos:           number
  aulasHoje:             AulaHoje[]
  aulasAmanha:           number
  todosAlunos:           AlunoCobranca[]
  mesRef:                string
  remarcacoesUrgentes:   number
  aniversariosAmanha:    string[]
  aniversariosMes:       string[]
  novosAlunosMes:        number
}

// ─── constants ────────────────────────────────────────────────────────────────

const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const TIPO_COLOR: Record<AulaHoje['tipo'], string> = {
  regular:    '#10B981',
  reposicao:  '#38BDF8',
  aula_extra: '#FBBF24',
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

// ─── AlertaCarrossel ──────────────────────────────────────────────────────────

function AlertaCarrossel({ alertas }: { alertas: AlertaItem[] }) {
  const router = useRouter()
  const [idx, setIdx]         = useState(0)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback((next: number) => {
    setVisible(false)
    setTimeout(() => { setIdx(next); setVisible(true) }, 180)
  }, [])

  useEffect(() => {
    if (alertas.length <= 1) return
    const id = setInterval(() => goTo((idx + 1) % alertas.length), 5000)
    return () => clearInterval(id)
  }, [idx, alertas.length, goTo])

  if (alertas.length === 0) return null

  const alerta  = alertas[Math.min(idx, alertas.length - 1)]
  const safeIdx = Math.min(idx, alertas.length - 1)

  function handleClick() {
    if (alerta.href) router.push(alerta.href)
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div
        onClick={alerta.href ? handleClick : undefined}
        className="flex items-center"
        style={{
          gap: 12,
          padding: '12px 16px',
          cursor: alerta.href ? 'pointer' : 'default',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}
      >
        {/* Icon */}
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{alerta.icon}</span>

        {/* Text */}
        <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {alerta.text}
        </p>

        {/* Arrow (only when clickable) */}
        {alerta.href && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>

      {/* Navigation dots */}
      {alertas.length > 1 && (
        <div className="flex items-center justify-center pb-3" style={{ gap: 5 }}>
          {alertas.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width:  i === safeIdx ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === safeIdx ? 'var(--green-primary)' : 'var(--border-subtle)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── component ───────────────────────────────────────────────────────────────

export function DashboardHome({
  professorNome,
  faturamento,
  totalAlunos,
  aulasHoje,
  aulasAmanha,
  todosAlunos: todosAlunosInit,
  mesRef,
  remarcacoesUrgentes,
  aniversariosAmanha,
  aniversariosMes,
  novosAlunosMes,
}: Props) {
  const [alunosCobranca, setAlunosCobranca] = useState<AlunoCobranca[]>(todosAlunosInit)
  const [cobrancaTab, setCobrancaTab]       = useState<CobrancaTab>('pendente')
  const [faltaModal, setFaltaModal]         = useState<AulaHoje | null>(null)

  const router = useRouter()

  // ── real-time clock ───────────────────────────────────────────────────────
  const [clock, setClock] = useState(() => {
    const n = new Date(); return { h: n.getHours(), m: n.getMinutes() }
  })
  useEffect(() => {
    const id = setInterval(() => { const n = new Date(); setClock({ h: n.getHours(), m: n.getMinutes() }) }, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── derived state ─────────────────────────────────────────────────────────
  const nowMin     = clock.h * 60 + clock.m
  const proximaIdx = aulasHoje.findIndex(a => a.horario && timeToMin(a.horario) >= nowMin)

  const pendentesTab = alunosCobranca.filter(a => a.status === 'pendente')
  const enviadasTab  = alunosCobranca.filter(a => a.status === 'enviado')
  const pagosTab     = alunosCobranca.filter(a => a.status === 'pago')

  // ── date / time display ───────────────────────────────────────────────────
  const today   = new Date()
  const dayNum  = today.getDate()
  const mesAbr  = MESES_ABR[today.getMonth()]
  const timeStr = `${String(clock.h).padStart(2, '0')}:${String(clock.m).padStart(2, '0')}`
  const [, mesMesStr] = mesRef.split('-')
  const mesMes  = parseInt(mesMesStr)

  const mesNome = new Date(parseInt(mesRef.split('-')[0]), mesMes - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // ── alertas ───────────────────────────────────────────────────────────────
  const alertas: AlertaItem[] = []

  const pendentesCount = alunosCobranca.filter(a => a.status === 'pendente').length

  // b) Novo mês (primeiros 3 dias)
  if (today.getDate() <= 3) {
    alertas.push({ id: 'novo-mes', icon: '📅', text: 'Novo mês! Hora de gerar as cobranças', href: '/dashboard/financeiro?tab=cobranca' })
  }

  // a) Pagamentos pendentes
  if (pendentesCount > 0) {
    alertas.push({ id: 'pendentes', icon: '⏰', text: `${pendentesCount} aluno${pendentesCount !== 1 ? 's' : ''} com pagamento pendente`, href: '/dashboard/financeiro?tab=cobranca' })
  }

  // c) Todos pagaram
  if (pendentesCount === 0 && alunosCobranca.length > 0 && enviadasTab.length === 0) {
    alertas.push({ id: 'todos-pagos', icon: '✅', text: 'Todos os alunos pagos este mês!', href: '' })
  }

  // d) Remarcações urgentes
  if (remarcacoesUrgentes > 0) {
    alertas.push({ id: 'remarcacoes', icon: '📋', text: `${remarcacoesUrgentes} remarcaç${remarcacoesUrgentes === 1 ? 'ão vence' : 'ões vencem'} esta semana`, href: '/dashboard/agenda?tab=faltas' })
  }

  // e) Aulas amanhã
  if (aulasAmanha > 0) {
    alertas.push({ id: 'amanha', icon: '📚', text: `Amanhã você tem ${aulasAmanha} aula${aulasAmanha !== 1 ? 's' : ''}`, href: '/dashboard/agenda' })
  }

  // f) Aniversário amanhã
  aniversariosAmanha.forEach(nome => {
    alertas.push({ id: `aniv-amanha-${nome}`, icon: '🎂', text: `Aniversário de ${nome} amanhã`, href: '' })
  })

  // g) Aniversariantes do mês (se nenhum é amanhã)
  if (aniversariosAmanha.length === 0 && aniversariosMes.length > 0) {
    const nomes = aniversariosMes.slice(0, 3).join(', ') + (aniversariosMes.length > 3 ? `…` : '')
    alertas.push({ id: 'aniv-mes', icon: '🎉', text: `Aniversariantes do mês: ${nomes}`, href: '' })
  }

  // h) Novos alunos
  if (novosAlunosMes > 0) {
    alertas.push({ id: 'novos', icon: '📈', text: `${novosAlunosMes} aluno${novosAlunosMes !== 1 ? 's' : ''} novo${novosAlunosMes !== 1 ? 's' : ''} este mês`, href: '/dashboard/alunos' })
  }

  // limit 5
  const alertasVisiveis = alertas.slice(0, 5)

  // ── cobrança handlers ─────────────────────────────────────────────────────
  async function handleMarcarPago(alunoId: string) {
    const aluno = alunosCobranca.find(a => a.alunoId === alunoId)
    if (!aluno) return
    setAlunosCobranca(prev => prev.map(a => a.alunoId === alunoId ? { ...a, status: 'pago' } : a))
    const res = await upsertCobrancaPagoAction(alunoId, mesRef, aluno.valor)
    if (res.id) setAlunosCobranca(prev => prev.map(a => a.alunoId === alunoId ? { ...a, cobrancaId: res.id! } : a))
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

  // ── tab label helper ──────────────────────────────────────────────────────
  const TAB_LABELS: { key: CobrancaTab; label: string; count: number }[] = [
    { key: 'pendente', label: 'Pendentes', count: pendentesTab.length },
    { key: 'enviado',  label: 'Enviadas',  count: enviadasTab.length },
    { key: 'pago',     label: 'Pagos',     count: pagosTab.length },
  ]

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 flex flex-col" style={{ gap: 16, maxWidth: 680, margin: '0 auto', width: '100%' }}>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 1 — DATA + HORA                                       ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="flex items-end justify-between px-1">
        <p className="font-black leading-none"
          style={{ fontSize: 'clamp(2.2rem, 7vw, 3rem)', color: 'var(--green-primary)', letterSpacing: '-0.03em' }}>
          {dayNum} {mesAbr}
        </p>
        <p className="font-black leading-none"
          style={{ fontSize: 'clamp(2.2rem, 7vw, 3rem)', color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
          {timeStr}
        </p>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 2 — CARROSSEL DE ALERTAS                              ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <AlertaCarrossel alertas={alertasVisiveis} />

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 3 — SAUDAÇÃO + TIMELINE DO DIA                        ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '18px 20px' }}>

        {/* Saudação */}
        <div className="flex items-baseline gap-1.5 mb-4 flex-wrap">
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {getGreeting()}, {professorNome.split(' ')[0]}! 👋
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>·</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>
            {aulasHoje.length === 0 ? 'Sem aulas hoje' : `${aulasHoje.length} aula${aulasHoje.length !== 1 ? 's' : ''} hoje`}
          </p>
        </div>

        {aulasHoje.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
            Nenhum compromisso hoje. Aproveite! 😎
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: 5 }}>
            {aulasHoje.map((aula, i) => {
              const isProxima  = i === proximaIdx
              const isPast     = proximaIdx < 0
                ? timeToMin(aula.horario) < nowMin
                : i < proximaIdx
              const cor        = TIPO_COLOR[aula.tipo]

              return (
                <button
                  key={`${aula.alunoId}-${i}`}
                  type="button"
                  onClick={() => setFaltaModal(aula)}
                  className="flex items-center rounded-xl transition-all w-full text-left cursor-pointer"
                  style={{
                    gap: 12,
                    padding: isProxima ? '12px 14px' : '8px 12px',
                    background: isProxima ? `${cor}18` : 'transparent',
                    border: isProxima
                      ? `1px solid ${cor}30`
                      : '1px solid transparent',
                    borderLeft: `${isProxima ? 4 : 2}px solid ${isProxima ? cor : isPast ? 'var(--border-subtle)' : cor + '50'}`,
                    opacity: isPast ? 0.38 : 1,
                  }}
                >
                  {/* Horário */}
                  <span
                    className="tabular-nums shrink-0"
                    style={{
                      minWidth: 40,
                      fontSize: isProxima ? '0.9rem' : '0.8rem',
                      fontWeight: isProxima ? 800 : 600,
                      color: isProxima ? cor : isPast ? 'var(--text-muted)' : 'var(--text-secondary)',
                    }}
                  >
                    {aula.horario || '—'}
                  </span>

                  {/* Aluno + local */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: isProxima ? '0.9rem' : '0.82rem',
                        fontWeight: isProxima ? 700 : 500,
                        color: isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isPast ? 'line-through' : 'none',
                      }}
                    >
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
                        className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
                        style={{ background: cor, color: '#000' }}
                      >
                        PRÓXIMA
                      </span>
                    )}
                    {!isProxima && aula.tipo === 'reposicao' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(56, 189, 248,0.12)', color: '#38BDF8' }}>Repo</span>
                    )}
                    {!isProxima && aula.tipo === 'aula_extra' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,235,59,0.12)', color: '#FBBF24' }}>Extra</span>
                    )}
                    {isProxima && aula.tipo === 'reposicao' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded ml-1"
                        style={{ background: 'rgba(56, 189, 248,0.12)', color: '#38BDF8' }}>Repo</span>
                    )}
                    {isProxima && aula.tipo === 'aula_extra' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded ml-1"
                        style={{ background: 'rgba(255,235,59,0.12)', color: '#FBBF24' }}>Extra</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 4 — MÉTRICAS (1/3 + 2/3)                             ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <Link href="/dashboard/alunos"
          className="rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '20px 12px', gap: 4, minHeight: 96, transition: 'border-color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
          <p className="font-black leading-none"
            style={{ fontSize: 'clamp(2.2rem, 8vw, 3.2rem)', color: 'var(--green-primary)', letterSpacing: '-0.04em' }}>
            {totalAlunos}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>alunos ativos</p>
        </Link>

        <Link href="/dashboard/financeiro"
          className="rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '20px 16px', gap: 4, minHeight: 96, transition: 'border-color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
          <p className="font-black leading-none tracking-tight"
            style={{ fontSize: 'clamp(1.4rem, 5vw, 2.1rem)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {formatCurrency(faturamento)}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            faturamento · {MESES_ABR[mesMes - 1]}
          </p>
        </Link>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  BLOCO 5 — COBRANÇAS COM ABAS                                ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Cobranças</p>
          <Link href="/dashboard/financeiro?tab=cobranca" className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Ver tudo →
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-2" style={{ gap: 4, borderBottom: '1px solid var(--border-subtle)' }}>
          {TAB_LABELS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setCobrancaTab(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={cobrancaTab === key
                ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }
              }
            >
              {label}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{
                  background: cobrancaTab === key ? 'rgba(16, 185, 129,0.2)' : 'var(--bg-input)',
                  color: cobrancaTab === key ? 'var(--green-primary)' : 'var(--text-muted)',
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div style={{ maxHeight: 280, overflowY: 'auto', padding: '10px 16px 14px' }}>

          {/* ── PENDENTES ── */}
          {cobrancaTab === 'pendente' && (
            pendentesTab.length === 0 ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <span className="text-lg">🎉</span>
                <p className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>
                  Nenhuma pendência!
                </p>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 5 }}>
                {pendentesTab.map(a => {
                  const whatsUrl   = buildWhatsApp(a)
                  const todayDate  = new Date()
                  const dueDiff    = (a.dia_cobranca || 1) - todayDate.getDate()
                  const isOverdue  = dueDiff < 0
                  const isDueToday = dueDiff === 0
                  return (
                    <div key={a.alunoId} className="flex items-center rounded-xl"
                      style={{ gap: 10, padding: '9px 12px', background: 'var(--bg-input)', border: isOverdue ? '1px solid rgba(239, 68, 68,0.2)' : '1px solid transparent' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(245, 158, 11,0.12)', color: '#F59E0B' }}>
                        {a.alunoNome.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {a.alunoNome.split(' ')[0]}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {formatCurrency(a.valor)}
                          {isOverdue
                            ? <span style={{ color: '#EF4444', fontWeight: 600 }}> · atrasado {Math.abs(dueDiff)}d</span>
                            : isDueToday
                            ? <span style={{ color: '#F59E0B', fontWeight: 600 }}> · vence hoje</span>
                            : ` · vence dia ${a.dia_cobranca || 1}`}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {whatsUrl !== '#' && (
                          <a href={whatsUrl} target="_blank" rel="noopener noreferrer"
                            className="px-2 py-1.5 rounded-lg text-[11px] font-semibold"
                            style={{ background: 'rgba(16, 185, 129,0.1)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
                            Cobrar
                          </a>
                        )}
                        <button onClick={() => handleMarcarPago(a.alunoId)}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                          Pago ✓
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── ENVIADAS ── */}
          {cobrancaTab === 'enviado' && (
            enviadasTab.length === 0 ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma cobrança enviada.</p>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 5 }}>
                {enviadasTab.map(a => (
                  <div key={a.alunoId} className="flex items-center rounded-xl"
                    style={{ gap: 10, padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid transparent' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: 'rgba(56, 189, 248,0.12)', color: '#38BDF8' }}>
                      {a.alunoNome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.alunoNome.split(' ')[0]}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(a.valor)}
                        {a.diasDesdeEnvio != null && a.diasDesdeEnvio > 0
                          ? ` · enviado há ${a.diasDesdeEnvio}d`
                          : ' · enviado'}
                      </p>
                    </div>
                    <button onClick={() => handleMarcarPago(a.alunoId)}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer shrink-0"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                      Pago ✓
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── PAGOS ── */}
          {cobrancaTab === 'pago' && (
            pagosTab.length === 0 ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum pagamento registrado.</p>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 4 }}>
                {pagosTab.map(a => (
                  <div key={a.alunoId} className="flex items-center rounded-lg"
                    style={{ gap: 8, padding: '7px 10px', background: 'var(--bg-input)' }}>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: 'rgba(16, 185, 129,0.12)', color: 'var(--green-primary)' }}>
                      ✓
                    </span>
                    <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {a.alunoNome.split(' ')[0]}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(a.valor)}
                    </span>
                    <button onClick={() => handleDesfazer(a.alunoId)}
                      className="text-[10px] cursor-pointer shrink-0"
                      style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', padding: 0 }}>
                      desfazer
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  MODAL — Registrar falta / cancelamento a partir da timeline  ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      {faltaModal && (
        <FaltaQuickActionModal
          alunoId={faltaModal.alunoId}
          alunoNome={faltaModal.alunoNome}
          dataFalta={(() => {
            const n = new Date()
            return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
          })()}
          horario={faltaModal.horario}
          contextLabel="Hoje"
          onClose={() => setFaltaModal(null)}
          onGoToFaltas={() => { setFaltaModal(null); router.push('/dashboard/agenda?tab=faltas') }}
        />
      )}

    </div>
  )
}
