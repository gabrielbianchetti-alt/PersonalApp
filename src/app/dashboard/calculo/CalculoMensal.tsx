'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DIAS_SEMANA, formatCurrency, formatDate } from '@/types/aluno'
import { countWeekdaysInMonth } from '@/lib/utils/date'
import { getFeriadosDoMes, diaSemanaKey, diaSemanaLabel, formatDM } from '@/lib/utils/feriados'
import { getFeriadoDecisoesAction, saveFeriadoDecisaoAction } from '../feriados/actions'
import { type PacoteComAluno } from '../pacotes/actions'
import { RenovarPacoteModal } from '@/components/dashboard/RenovarPacoteModal'

// ─── helpers ────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type ModeloKey = 'por_aula' | 'mensalidade' | 'pacote_fixo' | 'pacote_alternado'

const MODELO_TAG: Record<ModeloKey, { short: string; label: string; color: string; bg: string }> = {
  por_aula:         { short: 'Por aula',  label: 'Por aula',         color: '#3B82F6', bg: 'rgba(59, 130, 246,0.14)' },
  mensalidade:      { short: 'Mensal',    label: 'Mensalidade',      color: '#10B981', bg: 'rgba(16, 185, 129,0.14)' },
  pacote_fixo:      { short: 'Pac. Fixo', label: 'Pacote Fixo',      color: '#8B5CF6', bg: 'rgba(139, 92, 246,0.14)' },
  pacote_alternado: { short: 'Pac. Alt.', label: 'Pacote Alternado', color: '#F59E0B', bg: 'rgba(245, 158, 11,0.14)' },
}

// ─── types ───────────────────────────────────────────────────────────────────

interface Aluno {
  id: string
  nome: string
  horarios: { dia: string; horario: string }[]
  modelo_cobranca: string
  valor: number
  forma_pagamento: string
}

interface Preferencias {
  chave_pix: string | null
  favorecido_pix: string | null
  link_cartao: string | null
}

interface Props {
  alunos: Aluno[]
  pacotes?: PacoteComAluno[]
  preferencias?: Preferencias | null
}

// ─── helpers ────────────────────────────────────────────────────────────────

function findPacoteDoMes(pacotes: PacoteComAluno[], alunoId: string, year: number, month: number): PacoteComAluno | null {
  const mesRef = `${year}-${String(month + 1).padStart(2, '0')}`
  return pacotes.find(p => p.aluno_id === alunoId && p.data_cobranca.startsWith(mesRef)) ?? null
}

function findLatestPacote(pacotes: PacoteComAluno[], alunoId: string): PacoteComAluno | null {
  const list = pacotes.filter(p => p.aluno_id === alunoId)
  if (list.length === 0) return null
  return [...list].sort((a, b) => b.data_cobranca.localeCompare(a.data_cobranca))[0]
}

function getModeloKey(aluno: Aluno, latestPacote: PacoteComAluno | null): ModeloKey {
  if (aluno.modelo_cobranca === 'pacote') {
    return latestPacote?.tipo_pacote === 'fixo' ? 'pacote_fixo' : 'pacote_alternado'
  }
  if (aluno.modelo_cobranca === 'mensalidade') return 'mensalidade'
  return 'por_aula'
}

function ModeloTag({ modelo }: { modelo: ModeloKey }) {
  const cfg = MODELO_TAG[modelo]
  return (
    <span
      className="text-[10px] px-1.5 py-px rounded-full font-semibold shrink-0 uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.color }}
      title={cfg.label}
    >
      {cfg.short}
    </span>
  )
}

// ─── component ───────────────────────────────────────────────────────────────

export function CalculoMensal({ alunos, pacotes = [], preferencias = null }: Props) {
  const router = useRouter()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // alunoId → número de aulas ajustadas manualmente
  const [adjustments, setAdjustments] = useState<Record<string, number>>({})
  // qual aluno está com o campo de ajuste aberto
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  // valor temporário enquanto o usuário digita
  const [adjustingValue, setAdjustingValue] = useState<string>('')

  // aulas_extra do mês ANTERIOR: aluno_id → { count, totalValor }
  const [extras, setExtras] = useState<Record<string, { count: number; totalValor: number }>>({})
  // aulas de pacote realmente DADAS no mês exibido (eventos_agenda com pacote_id)
  const [pacoteAulas, setPacoteAulas] = useState<Record<string, number>>({})
  const isFirstMount = useRef(true)

  // Renovar pacote modal
  const [renovarPacote, setRenovarPacote] = useState<{ aluno: Aluno; pacote: PacoteComAluno } | null>(null)

  // Feriados do mês + decisões do professor (data → dar_aula)
  const mesRef = `${year}-${String(month + 1).padStart(2, '0')}`
  const feriadosMes = useMemo(() => getFeriadosDoMes(mesRef), [mesRef])
  const [decisoes, setDecisoes] = useState<Record<string, boolean>>({})

  // Carrega decisões ao trocar de mês
  useEffect(() => {
    getFeriadoDecisoesAction(mesRef).then(res => {
      if (res.data) {
        const map: Record<string, boolean> = {}
        for (const d of res.data) map[d.data_feriado] = d.dar_aula
        setDecisoes(map)
      }
    })
  }, [mesRef])

  async function toggleFeriado(data: string, checked: boolean) {
    setDecisoes(prev => ({ ...prev, [data]: checked }))
    await saveFeriadoDecisaoAction(data, checked)
  }

  // ── navegação de mês ──────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // ── aulas extras do mês anterior + aulas de pacote do mês atual ──────────

  useEffect(() => {
    // Mês anterior (extras)
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear  = month === 0 ? year - 1 : year
    const prevMesRef = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`
    const prevStart  = `${prevMesRef}-01`
    const prevLast   = new Date(prevYear, prevMonth + 1, 0).getDate()
    const prevEnd    = `${prevMesRef}-${String(prevLast).padStart(2, '0')}`

    // Mês atual (aulas de pacote)
    const curStart  = `${mesRef}-01`
    const curLast   = new Date(year, month + 1, 0).getDate()
    const curEnd    = `${mesRef}-${String(curLast).padStart(2, '0')}`

    const supabase = createClient()

    const fetchExtras = supabase
      .from('eventos_agenda')
      .select('aluno_id, valor')
      .eq('tipo', 'aula_extra')
      .gte('data_especifica', prevStart)
      .lte('data_especifica', prevEnd)
      .then(({ data }) => {
        const map: Record<string, { count: number; totalValor: number }> = {}
        for (const row of (data ?? [])) {
          if (!row.aluno_id) continue
          const prev = map[row.aluno_id] ?? { count: 0, totalValor: 0 }
          map[row.aluno_id] = {
            count:      prev.count + 1,
            totalValor: prev.totalValor + Number(row.valor ?? 0),
          }
        }
        setExtras(map)
      })

    const fetchPacoteAulas = supabase
      .from('eventos_agenda')
      .select('aluno_id')
      .eq('tipo', 'aula')
      .not('pacote_id', 'is', null)
      .gte('data_especifica', curStart)
      .lte('data_especifica', curEnd)
      .then(({ data }) => {
        const map: Record<string, number> = {}
        for (const row of (data ?? [])) {
          if (!row.aluno_id) continue
          map[row.aluno_id] = (map[row.aluno_id] ?? 0) + 1
        }
        setPacoteAulas(map)
      })

    Promise.all([fetchExtras, fetchPacoteAulas]).then(() => {
      if (!isFirstMount.current) setAdjustments({})
      isFirstMount.current = false
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  // ── contagem de dias ──────────────────────────────────────────────────────

  const weekdayCounts = useMemo(() => countWeekdaysInMonth(year, month), [year, month])

  // ── cálculos por aluno ────────────────────────────────────────────────────

  function getFixedAulas(aluno: Aluno): number {
    if (aluno.modelo_cobranca === 'mensalidade') return 0
    if (aluno.modelo_cobranca === 'pacote')      return 0
    let total = aluno.horarios.reduce((sum, h) => sum + (weekdayCounts[h.dia] ?? 0), 0)
    // Desconta feriados onde o aluno treina e o professor NÃO decidiu dar aula
    for (const f of feriadosMes) {
      const darAula = decisoes[f.data] === true
      if (darAula) continue
      const diaKey = diaSemanaKey(f.data)
      if (aluno.horarios.some(h => h.dia === diaKey)) total -= 1
    }
    return Math.max(0, total)
  }

  function getCalculatedAulas(aluno: Aluno): number {
    if (aluno.modelo_cobranca === 'mensalidade') return 0
    if (aluno.modelo_cobranca === 'pacote')      return pacoteAulas[aluno.id] ?? 0
    return getFixedAulas(aluno) + (extras[aluno.id]?.count ?? 0)
  }

  function getAulas(aluno: Aluno): number {
    return adjustments[aluno.id] !== undefined
      ? adjustments[aluno.id]
      : getCalculatedAulas(aluno)
  }

  function getTotal(aluno: Aluno): number {
    if (aluno.modelo_cobranca === 'pacote') {
      const pacoteMes = findPacoteDoMes(pacotes, aluno.id, year, month)
      return pacoteMes ? Number(pacoteMes.valor) : 0
    }
    if (aluno.modelo_cobranca === 'mensalidade') {
      return Number(aluno.valor) + (extras[aluno.id]?.totalValor ?? 0)
    }
    return getAulas(aluno) * Number(aluno.valor)
  }

  // ── ajuste manual ─────────────────────────────────────────────────────────

  function openAdjust(aluno: Aluno) {
    setAdjustingId(aluno.id)
    setAdjustingValue(String(getAulas(aluno)))
  }

  function confirmAdjust(aluno: Aluno) {
    const val = parseInt(adjustingValue)
    if (!isNaN(val) && val >= 0) {
      if (val === getCalculatedAulas(aluno)) {
        // igual ao calculado → remove ajuste
        setAdjustments((prev) => { const n = { ...prev }; delete n[aluno.id]; return n })
      } else {
        setAdjustments((prev) => ({ ...prev, [aluno.id]: val }))
      }
    }
    setAdjustingId(null)
  }

  function cancelAdjust() {
    setAdjustingId(null)
  }

  function removeAdjust(alunoId: string) {
    setAdjustments((prev) => { const n = { ...prev }; delete n[alunoId]; return n })
  }

  // ── totais gerais ─────────────────────────────────────────────────────────

  // Total de aulas: soma das aulas de TODOS os alunos (por_aula + pacote aulas no mês)
  const totalAulas = alunos
    .filter((a) => a.modelo_cobranca !== 'mensalidade')
    .reduce((sum, a) => sum + getAulas(a), 0)

  const faturamentoBruto = alunos.reduce((sum, a) => sum + getTotal(a), 0)

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Cálculo Mensal
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Número exato de aulas e faturamento por aluno
        </p>
      </div>

      {/* ── Seletor de mês ────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          aria-label="Mês anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-center min-w-44">
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {MESES[month]}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{year}</p>
        </div>

        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          aria-label="Próximo mês"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── Banner de feriados do mês ─────────────────────────────────── */}
      {feriadosMes.length > 0 && (
        <div className="rounded-2xl mb-6 overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(236, 72, 153, 0.1)', borderBottom: '1px solid rgba(236, 72, 153, 0.2)' }}>
            <AlertTriangle size={16} strokeWidth={1.75} style={{ color: '#EC4899' }} aria-hidden />
            <p className="text-sm font-semibold" style={{ color: '#EC4899' }}>
              Este mês tem {feriadosMes.length === 1 ? '1 feriado' : `${feriadosMes.length} feriados`}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Por padrão, alunos que pagam por aula não são cobrados em feriados.
              Marque abaixo os feriados em que você dará aula normalmente.
            </p>
            {feriadosMes.map(f => {
              const diaKey = diaSemanaKey(f.data)
              const alunosAfetados = alunos.filter(a =>
                a.modelo_cobranca === 'por_aula' && a.horarios.some(h => h.dia === diaKey)
              )
              const checked = decisoes[f.data] === true
              return (
                <label key={f.data} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ background: 'var(--bg-input)' }}>
                  <input type="checkbox" checked={checked}
                    onChange={e => toggleFeriado(f.data, e.target.checked)}
                    style={{ accentColor: '#EC4899', width: 16, height: 16 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatDM(f.data)} ({diaSemanaLabel(f.data)}) — {f.nome}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {alunosAfetados.length === 0
                        ? 'Nenhum aluno treina nesse dia.'
                        : alunosAfetados.length === 1
                        ? `1 aluno treina nesse dia (${alunosAfetados[0].nome.split(' ')[0]}).`
                        : `${alunosAfetados.length} alunos treinam nesse dia.`}
                      {' '}
                      <span style={{ color: checked ? 'var(--green-primary)' : '#EC4899', fontWeight: 600 }}>
                        {checked ? 'Dando aula normalmente.' : 'Descontando do cálculo.'}
                      </span>
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Contagem de dias da semana ─────────────────────────────────── */}
      <div
        className="flex flex-wrap justify-center gap-2 mb-8 p-4 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        {DIAS_SEMANA.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-input)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </span>
            <span
              className="text-xs font-bold w-4 text-center"
              style={{ color: 'var(--green-primary)' }}
            >
              {weekdayCounts[key]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Cards de resumo ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div
          className="p-5 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Total de aulas
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {totalAulas}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            aulas no mês
          </p>
        </div>

        <div
          className="min-w-0 p-5 rounded-2xl"
          style={{ background: 'var(--green-muted)', border: '1px solid rgba(16, 185, 129,0.2)' }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--green-primary)', opacity: 0.8 }}>
            Faturamento bruto
          </p>
          <p className="text-lg font-bold leading-tight whitespace-nowrap overflow-hidden" style={{ color: 'var(--green-primary)' }}>
            {formatCurrency(faturamentoBruto)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--green-primary)', opacity: 0.7 }}>
            {MESES[month].toLowerCase()} de {year}
          </p>
        </div>
      </div>

      {/* ── Lista de alunos ───────────────────────────────────────────── */}
      {alunos.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mb-3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Nenhum aluno ativo
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Cadastre alunos para ver o cálculo mensal
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alunos.map((aluno) => {
            const fixedAulas    = getFixedAulas(aluno)
            const extraInfo     = extras[aluno.id]
            const calculado     = getCalculatedAulas(aluno)
            const aulas         = getAulas(aluno)
            const total         = getTotal(aluno)
            const isAjustado    = adjustments[aluno.id] !== undefined
            const isAjustando   = adjustingId === aluno.id
            const isMensalidade = aluno.modelo_cobranca === 'mensalidade'
            const isPacote      = aluno.modelo_cobranca === 'pacote'
            const pacoteMes     = isPacote ? findPacoteDoMes(pacotes, aluno.id, year, month) : null
            const latestPac     = isPacote ? findLatestPacote(pacotes, aluno.id) : null
            const modeloKey     = getModeloKey(aluno, latestPac)
            const todayStr      = new Date().toISOString().split('T')[0]
            const pacoteVencido = isPacote && !pacoteMes && !!latestPac && (
              latestPac.data_vencimento < todayStr ||
              latestPac.quantidade_usada >= latestPac.quantidade_total
            )
            const showRenovar   = isPacote && !pacoteMes && !!latestPac && pacoteVencido
            const pacoteAtivoOutroMes = isPacote && !pacoteMes && !!latestPac && !pacoteVencido

            const diasLabels = aluno.horarios.map(h => {
              const found = DIAS_SEMANA.find(s => s.key === h.dia)
              return `${found?.label ?? h.dia} ${h.horario}`
            })

            return (
              <div
                key={aluno.id}
                className="p-5 rounded-2xl"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${
                    showRenovar ? 'rgba(245, 158, 11,0.45)' :
                    isAjustado  ? 'rgba(16, 185, 129,0.25)' :
                                  'var(--border-subtle)'
                  }`,
                }}
              >
                {/* Linha superior: avatar + nome + total */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
                    >
                      {aluno.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="font-semibold text-sm truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {aluno.nome}
                        </p>
                        <ModeloTag modelo={modeloKey} />
                        {showRenovar && (
                          <span className="text-xs px-1.5 py-px rounded-full font-semibold shrink-0"
                            style={{ background: 'rgba(245, 158, 11,0.15)', color: '#F59E0B' }}>
                            Renovação pendente
                          </span>
                        )}
                      </div>
                      {/* Chips de dias (se houver) */}
                      {diasLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {diasLabels.map((dia) => (
                            <span
                              key={dia}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                            >
                              {dia}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold" style={{ color: 'var(--green-primary)' }}>
                      {formatCurrency(total)}
                    </p>
                    {!isMensalidade && !isPacote && extraInfo && (
                      <p className="text-xs font-medium" style={{ color: '#69F0AE' }}>
                        +{extraInfo.count} extra{extraInfo.count > 1 ? 's' : ''}
                      </p>
                    )}
                    {isMensalidade && extraInfo && (
                      <p className="text-xs font-medium" style={{ color: '#69F0AE' }}>
                        +{formatCurrency(extraInfo.totalValor)} extras
                      </p>
                    )}
                    {isPacote && pacoteAtivoOutroMes && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Pago no início do pacote
                      </p>
                    )}
                    {!isPacote && !extraInfo && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>total</p>}
                  </div>
                </div>

                {/* ─── Linha de detalhes ─── */}
                {/* Pacote — mês inicial */}
                {isPacote && pacoteMes && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                      </svg>
                      <span className="text-xs">{pacoteMes.quantidade_total} aulas</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· pacote {pacoteMes.tipo_pacote === 'fixo' ? 'fixo' : 'alternado'}</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Validade: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(pacoteMes.data_inicio)} → {formatDate(pacoteMes.data_vencimento)}</span>
                    </div>
                  </div>
                )}

                {/* Pacote — meses seguintes (ativo, sem cobrança) */}
                {isPacote && pacoteAtivoOutroMes && latestPac && (
                  <div className="flex items-center gap-2 pt-4 text-xs"
                    style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Pacote ativo — sem cobrança neste mês.
                    <span style={{ color: 'var(--text-muted)' }}>
                      Vence em {formatDate(latestPac.data_vencimento)}
                      {(pacoteAulas[aluno.id] ?? 0) > 0 && ` · ${pacoteAulas[aluno.id]} aula${pacoteAulas[aluno.id] === 1 ? '' : 's'} no mês`}
                    </span>
                  </div>
                )}

                {/* Pacote — vencido / renovação pendente */}
                {showRenovar && latestPac && (
                  <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => setRenovarPacote({ aluno, pacote: latestPac })}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                      style={{ background: 'var(--green-primary)', color: '#000' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                      Renovar pacote
                    </button>
                  </div>
                )}

                {/* Não-pacote: detalhes existentes */}
                {!isPacote && (
                  <div
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    {/* Aulas */}
                    {!isMensalidade && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Aulas:
                        </span>

                        {isAjustando ? (
                          /* ── campo de ajuste ── */
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={adjustingValue}
                              onChange={(e) => setAdjustingValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') confirmAdjust(aluno); if (e.key === 'Escape') cancelAdjust() }}
                              autoFocus
                              className="w-16 h-7 rounded-lg px-2 text-sm text-center outline-none"
                              style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-focus)',
                                color: 'var(--text-primary)',
                              }}
                            />
                            <button
                              onClick={() => confirmAdjust(aluno)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                              style={{ background: 'var(--green-primary)', color: '#000' }}
                              title="Confirmar"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelAdjust}
                              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                              title="Cancelar"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          /* ── exibição normal ── */
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-bold"
                              style={{ color: isAjustado ? 'var(--green-primary)' : 'var(--text-primary)' }}
                            >
                              {aulas}
                              {isAjustado && (
                                <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                                  (calc: {calculado})
                                </span>
                              )}
                              {!isAjustado && extraInfo && (
                                <span className="text-xs font-normal ml-1" style={{ color: '#69F0AE' }}>
                                  ({fixedAulas} fixas + {extraInfo.count} extra{extraInfo.count > 1 ? 's' : ''})
                                </span>
                              )}
                            </span>

                            {isAjustado ? (
                              <button
                                onClick={() => removeAdjust(aluno.id)}
                                className="text-xs px-2 py-0.5 rounded cursor-pointer transition-colors"
                                style={{ color: '#FF8A80', background: 'rgba(239, 68, 68,0.08)', border: '1px solid rgba(239, 68, 68,0.2)' }}
                                title="Remover ajuste"
                              >
                                remover ajuste
                              </button>
                            ) : (
                              <button
                                onClick={() => openAdjust(aluno)}
                                className="text-xs px-2 py-0.5 rounded cursor-pointer transition-colors"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--green-primary)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129,0.4)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                              >
                                ajustar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modelo e valor */}
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {isMensalidade ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                          <span className="text-xs">Mensalidade fixa</span>
                          <span className="text-xs font-semibold ml-1" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(Number(aluno.valor))}
                          </span>
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          <span className="text-xs">{formatCurrency(Number(aluno.valor))}/aula</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            × {aulas} aulas
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Renovar pacote modal */}
      {renovarPacote && (
        <RenovarPacoteModal
          aluno={renovarPacote.aluno}
          pacote={renovarPacote.pacote}
          mesRef={mesRef}
          preferencias={preferencias}
          onClose={() => setRenovarPacote(null)}
          onSuccess={() => {
            setRenovarPacote(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
