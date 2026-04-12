'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, DIAS_SEMANA } from '@/types/aluno'
import { upsertCobrancaAction, updateStatusAction, CobrancaStatus } from './actions'

// ─── constants ───────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const GETDAY_TO_KEY: Record<number, string> = {
  1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab',
}

const DEFAULT_TEMPLATE = `Olá, {nome}! 👋

Segue sua cobrança referente a *{mes}*:

📅 Datas das aulas: dias {datas}
📊 Total de aulas: {aulas}
💰 Valor: *{total}*

{pagamento}`

const STATUS_CONFIG: Record<CobrancaStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: '#FFAB00', bg: 'rgba(255,171,0,0.12)' },
  enviado:  { label: 'Enviado',  color: '#40C4FF', bg: 'rgba(64,196,255,0.12)' },
  pago:     { label: 'Pago',     color: '#00E676', bg: 'rgba(0,230,118,0.12)' },
}
const STATUS_CYCLE: CobrancaStatus[] = ['pendente', 'enviado', 'pago']

// ─── types ───────────────────────────────────────────────────────────────────

interface AlunoCobranca {
  id: string
  nome: string
  whatsapp: string
  horarios: { dia: string; horario: string }[]
  modelo_cobranca: string
  valor: number
  forma_pagamento: string
}

interface CobrancaRow {
  id: string
  aluno_id: string
  mes_referencia: string
  valor: number
  status: CobrancaStatus
  mensagem: string | null
}

interface Preferencias {
  chave_pix: string | null
  favorecido_pix: string | null
  link_cartao: string | null
  modelo_mensagem: string | null
}

interface Props {
  alunos: AlunoCobranca[]
  cobrancasIniciais: CobrancaRow[]
  preferencias: Preferencias | null
  mesInicial: string // "2026-04"
  creditosPorAluno?: Record<string, number>
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseMes(mesRef: string): { year: number; month: number } {
  const [y, m] = mesRef.split('-').map(Number)
  return { year: y, month: m - 1 }
}

function formatMesRef(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getAulasDates(year: number, month: number, horarios: { dia: string; horario: string }[]): number[] {
  const days = new Date(year, month + 1, 0).getDate()
  const dates: number[] = []
  const dias = horarios.map(h => h.dia)
  for (let d = 1; d <= days; d++) {
    const key = GETDAY_TO_KEY[new Date(year, month, d).getDay()]
    if (key && dias.includes(key)) dates.push(d)
  }
  return dates
}

function buildPaymentBlock(aluno: AlunoCobranca, prefs: Preferencias | null): string {
  if (!prefs) return '⚙️ Configure as preferências de cobrança'
  if (aluno.forma_pagamento === 'pix') {
    if (!prefs.chave_pix) return '⚙️ Configure sua chave Pix em Preferências'
    let block = `💳 *Pix:* ${prefs.chave_pix}`
    if (prefs.favorecido_pix) block += `\n👤 Favorecido: ${prefs.favorecido_pix}`
    return block
  }
  if (!prefs.link_cartao) return '⚙️ Configure o link de pagamento em Preferências'
  return `💳 *Cartão:* ${prefs.link_cartao}`
}

function buildMessage(
  aluno: AlunoCobranca,
  year: number,
  month: number,
  prefs: Preferencias | null,
  template: string
): string {
  const dates = getAulasDates(year, month, aluno.horarios)
  const total = aluno.modelo_cobranca === 'mensalidade'
    ? Number(aluno.valor)
    : dates.length * Number(aluno.valor)

  return template
    .replace(/{nome}/g, aluno.nome.split(' ')[0])
    .replace(/{mes}/g, `${MESES[month]} de ${year}`)
    .replace(/{datas}/g, dates.join(', ') || '—')
    .replace(/{aulas}/g, String(dates.length))
    .replace(/{total}/g, formatCurrency(total))
    .replace(/{pagamento}/g, buildPaymentBlock(aluno, prefs))
}

function calcTotal(aluno: AlunoCobranca, year: number, month: number): number {
  if (aluno.modelo_cobranca === 'mensalidade') return Number(aluno.valor)
  return getAulasDates(year, month, aluno.horarios).length * Number(aluno.valor)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
  onClick,
  loading,
}: {
  status: CobrancaStatus
  onClick: () => void
  loading?: boolean
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Clique para alterar o status"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:opacity-50"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {loading ? '...' : cfg.label}
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function CobrancaMensal({ alunos, cobrancasIniciais, preferencias, mesInicial, creditosPorAluno = {} }: Props) {
  const { year: y0, month: m0 } = parseMes(mesInicial)
  const [year, setYear]   = useState(y0)
  const [month, setMonth] = useState(m0)

  // alunoId → cobrança
  const [cobrancas, setCobrancas] = useState<Record<string, CobrancaRow>>(() => {
    const m: Record<string, CobrancaRow> = {}
    for (const c of cobrancasIniciais) m[c.aluno_id] = c
    return m
  })
  const [fetchingCobrancas, setFetchingCobrancas] = useState(false)

  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [messages, setMessages]             = useState<Record<string, string>>({})
  const [originalMessages, setOriginalMessages] = useState<Record<string, string>>({})
  const [loadingSet, setLoadingSet]         = useState<Set<string>>(new Set())

  const template = preferencias?.modelo_mensagem ?? DEFAULT_TEMPLATE
  const isFirstMount = useRef(true)

  // Re-fetch cobrancas when month changes (skip first mount, server already provided them)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }

    const mesRef = formatMesRef(year, month)
    setFetchingCobrancas(true)
    setSelectedIds(new Set())
    setMessages({})
    setOriginalMessages({})

    const supabase = createClient()
    supabase
      .from('cobrancas')
      .select('*')
      .eq('mes_referencia', mesRef)
      .then(({ data }) => {
        const m: Record<string, CobrancaRow> = {}
        for (const c of (data ?? [])) m[c.aluno_id] = c
        setCobrancas(m)
        setFetchingCobrancas(false)
      })
  }, [year, month])

  // ── navigation ──────────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // ── selection ───────────────────────────────────────────────────────────────

  function toggleSelect(aluno: AlunoCobranca) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(aluno.id)) {
        next.delete(aluno.id)
      } else {
        next.add(aluno.id)
        // Initialize message if not yet set
        if (!messages[aluno.id]) {
          const savedMsg = cobrancas[aluno.id]?.mensagem
          const generated = buildMessage(aluno, year, month, preferencias, template)
          setOriginalMessages(p => ({ ...p, [aluno.id]: generated }))
          setMessages(p => ({ ...p, [aluno.id]: savedMsg ?? generated }))
        }
      }
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === alunos.length) {
      setSelectedIds(new Set())
    } else {
      const next = new Set(alunos.map(a => a.id))
      // Initialize messages for newly selected
      const newMsgs: Record<string, string> = { ...messages }
      const newOrig: Record<string, string> = { ...originalMessages }
      for (const aluno of alunos) {
        if (!newMsgs[aluno.id]) {
          const generated = buildMessage(aluno, year, month, preferencias, template)
          newOrig[aluno.id] = generated
          newMsgs[aluno.id] = cobrancas[aluno.id]?.mensagem ?? generated
        }
      }
      setOriginalMessages(newOrig)
      setMessages(newMsgs)
      setSelectedIds(next)
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  function setLoading(id: string, on: boolean) {
    setLoadingSet(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n })
  }

  // ── whatsapp ─────────────────────────────────────────────────────────────────

  const handleWhatsApp = useCallback(async (aluno: AlunoCobranca) => {
    const msg    = messages[aluno.id] ?? buildMessage(aluno, year, month, preferencias, template)
    const total  = calcTotal(aluno, year, month)
    const mesRef = formatMesRef(year, month)

    setLoading(aluno.id, true)
    const result = await upsertCobrancaAction({
      aluno_id: aluno.id,
      mes_referencia: mesRef,
      valor: total,
      status: 'enviado',
      mensagem: msg,
    })
    if (result && !result.error) {
      setCobrancas(prev => ({
        ...prev,
        [aluno.id]: {
          ...prev[aluno.id],
          id: result.id ?? prev[aluno.id]?.id,
          aluno_id: aluno.id,
          mes_referencia: mesRef,
          valor: total,
          status: 'enviado',
          mensagem: msg,
        },
      }))
    }
    setLoading(aluno.id, false)

    const digits = aluno.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`, '_blank')
  }, [messages, year, month, preferencias, template])

  // ── status update ─────────────────────────────────────────────────────────────

  async function handleStatusCycle(alunoId: string) {
    const cobranca = cobrancas[alunoId]
    if (!cobranca?.id) return
    const nextIdx  = (STATUS_CYCLE.indexOf(cobranca.status) + 1) % STATUS_CYCLE.length
    const nextStatus = STATUS_CYCLE[nextIdx]

    setLoading(alunoId, true)
    const result = await updateStatusAction(cobranca.id, nextStatus)
    if (!result?.error) {
      setCobrancas(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], status: nextStatus } }))
    }
    setLoading(alunoId, false)
  }

  // ── summary ───────────────────────────────────────────────────────────────────

  const totalFaturamento = alunos.reduce((s, a) => s + calcTotal(a, year, month), 0)
  const countPendente = Object.values(cobrancas).filter(c => c.status === 'pendente').length
  const countEnviado  = Object.values(cobrancas).filter(c => c.status === 'enviado').length
  const countPago     = Object.values(cobrancas).filter(c => c.status === 'pago').length

  const mesRef = formatMesRef(year, month)

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cobrança</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Gere e acompanhe cobranças mensais
          </p>
        </div>
        <Link
          href="/dashboard/cobranca/preferencias"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          title="Preferências de cobrança"
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} aria-label="Mês anterior"
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="text-center min-w-44">
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{MESES[month]}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{year}</p>
        </div>
        <button onClick={nextMonth} aria-label="Próximo mês"
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Faturamento', value: formatCurrency(totalFaturamento), green: true },
          { label: 'Pendente',    value: String(countPendente), suffix: ' cobr.' },
          { label: 'Enviado',     value: String(countEnviado),  suffix: ' cobr.' },
          { label: 'Pago',        value: String(countPago),     suffix: ' cobr.' },
        ].map(({ label, value, suffix, green }) => (
          <div key={label} className="p-4 rounded-xl"
            style={{ background: green ? 'var(--green-muted)' : 'var(--bg-card)', border: `1px solid ${green ? 'rgba(0,230,118,0.2)' : 'var(--border-subtle)'}` }}>
            <p className="text-xs mb-1" style={{ color: green ? 'var(--green-primary)' : 'var(--text-muted)' }}>{label}</p>
            <p className="text-lg font-bold leading-tight" style={{ color: green ? 'var(--green-primary)' : 'var(--text-primary)' }}>
              {value}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {alunos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum aluno ativo</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Cadastre alunos para gerenciar cobranças</p>
        </div>
      )}

      {alunos.length > 0 && (
        <>
          {/* Select all bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedIds.size === alunos.length}
                onChange={toggleAll}
                className="w-4 h-4 rounded cursor-pointer accent-[#00E676]"
              />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Selecionar todos
              </span>
            </label>
            {selectedIds.size > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Loading indicator */}
          {fetchingCobrancas && (
            <div className="flex items-center justify-center gap-2 py-4 mb-3 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--green-primary)" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando cobranças...</span>
            </div>
          )}

          {/* Aluno list */}
          <div className="flex flex-col gap-3">
            {alunos.map((aluno) => {
              const isSelected   = selectedIds.has(aluno.id)
              const cobranca     = cobrancas[aluno.id]
              const isLoading    = loadingSet.has(aluno.id)
              const dates        = getAulasDates(year, month, aluno.horarios)
              const aulas        = aluno.modelo_cobranca === 'mensalidade' ? null : dates.length
              const total        = calcTotal(aluno, year, month)
              const diasLabels   = aluno.horarios.map(h => DIAS_SEMANA.find(s => s.key === h.dia)?.label ?? h.dia)
              const credito      = creditosPorAluno[aluno.id] ?? 0

              return (
                <div key={aluno.id}
                  className="rounded-2xl overflow-hidden transition-all duration-150"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'rgba(0,230,118,0.25)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {/* Row header */}
                  <div className="flex items-center gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(aluno)}
                      className="w-4 h-4 rounded shrink-0 cursor-pointer accent-[#00E676]"
                    />

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                      {aluno.nome.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Name + days */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {aluno.nome}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {diasLabels.map(d => (
                          <span key={d} className="text-xs px-1.5 py-px rounded"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{d}</span>
                        ))}
                      </div>
                    </div>

                    {/* Aulas + total */}
                    <div className="text-right shrink-0 hidden sm:block">
                      {aulas !== null
                        ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{aulas} aula{aulas !== 1 ? 's' : ''}</p>
                        : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mensalidade</p>
                      }
                      <p className="text-sm font-bold" style={{ color: 'var(--green-primary)' }}>
                        {formatCurrency(total)}
                      </p>
                      {credito > 0 && (
                        <p className="text-xs font-medium" style={{ color: '#40C4FF' }}>
                          -{formatCurrency(credito)} crédito
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    {cobranca && (
                      <StatusBadge
                        status={cobranca.status}
                        loading={isLoading}
                        onClick={() => handleStatusCycle(aluno.id)}
                      />
                    )}
                  </div>

                  {/* Mobile: aulas + total */}
                  <div className="flex items-center justify-between px-4 pb-3 sm:hidden -mt-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {aulas !== null ? `${aulas} aulas` : 'Mensalidade'}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: 'var(--green-primary)' }}>
                        {formatCurrency(total)}
                      </span>
                      {credito > 0 && (
                        <p className="text-xs font-medium" style={{ color: '#40C4FF' }}>
                          -{formatCurrency(credito)} crédito
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded message area */}
                  {isSelected && (
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs font-medium mt-3 mb-2" style={{ color: 'var(--text-muted)' }}>
                        Mensagem de cobrança
                      </p>
                      <textarea
                        rows={10}
                        value={messages[aluno.id] ?? ''}
                        onChange={(e) => setMessages(prev => ({ ...prev, [aluno.id]: e.target.value }))}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none font-mono"
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          lineHeight: '1.6',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.06)' }}
                        onBlur={(e)  => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
                      />

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-3 mt-3">
                        <button
                          onClick={() => setMessages(prev => ({ ...prev, [aluno.id]: originalMessages[aluno.id] ?? '' }))}
                          className="text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors"
                          style={{ color: 'var(--text-secondary)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          ↩ Restaurar padrão
                        </button>

                        <button
                          onClick={() => handleWhatsApp(aluno)}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50"
                          style={{ background: '#25D366', color: '#000' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#1da851')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#25D366')}
                        >
                          {isLoading
                            ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          }
                          Enviar WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
