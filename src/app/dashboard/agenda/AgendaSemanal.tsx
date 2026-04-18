'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createEventoAction,
  createEventoSerieAction,
  updateEventoAction,
  deleteEventoAction,
  deleteEventoSerieAction,
  updateAlunoScheduleAction,
  type EventoTipo,
  type EventoAgendaRow,
} from './actions'
import {
  createFaltaAction,
  resolveFaltaAction,
  type FaltaRow,
} from '../faltas/actions'

// ─── constants ────────────────────────────────────────────────────────────────

const HOUR_PX    = 64
const MIN_PX     = HOUR_PX / 60
const GRID_START = 5 * 60 + 30   // 330 min = 5:30
const GRID_END   = 22 * 60       // 1320 min = 22:00
const GRID_TOTAL = GRID_END - GRID_START

const WEEK_KEYS   = ['seg','ter','qua','qui','sex','sab','dom'] as const
const WEEK_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
type DayKey = typeof WEEK_KEYS[number]

interface DayConfig { start: number; end: number }
const DAY_CFG: Record<DayKey, DayConfig> = {
  seg: { start: 330,  end: 1320 },
  ter: { start: 330,  end: 1320 },
  qua: { start: 330,  end: 1320 },
  qui: { start: 330,  end: 1320 },
  sex: { start: 330,  end: 1320 },
  sab: { start: 420,  end: 780  },
  dom: { start: 480,  end: 780  },
}

const TIPO_COLOR: Record<EventoTipo, string> = {
  aula:       '#10B981',
  reposicao:  '#38BDF8',
  reuniao:    '#F59E0B',
  bloqueado:  '#EF4444',
  refeicao:   '#9E9E9E',
  outro:      '#CE93D8',
  aula_extra: '#FBBF24',
}
const FALTA_COLOR        = '#EF4444'  // vermelho   — aluno faltou sem avisar
const CANCELAMENTO_COLOR = '#F59E0B'  // laranja    — cancelamento com antecedência (aluno avisou)
const PROFESSOR_COLOR    = '#8B5CF6'  // roxo       — professor cancelou
const TIPO_LABEL: Record<EventoTipo, string> = {
  aula:       'Aula',
  reposicao:  'Reposição',
  reuniao:    'Reunião',
  bloqueado:  'Bloqueado',
  refeicao:   'Refeição',
  outro:      'Outro',
  aula_extra: 'Aula Extra',
}
const OUTRO_CORES = ['#F59E0B','#CE93D8','#EF4444','#38BDF8','#9E9E9E']

const COMPACT_HOUR_PX = 40
const COMPACT_MIN_PX  = COMPACT_HOUR_PX / 60
const COMPACT_GRID_H  = Math.ceil((GRID_END - GRID_START) * COMPACT_MIN_PX)

// ─── types ────────────────────────────────────────────────────────────────────

interface AlunoAgenda {
  id: string
  nome: string
  horarios: { dia: string; horario: string }[]
  duracao: number
  local: string
  modelo_cobranca: string
  observacoes: string | null
}

interface DragData {
  blockType: 'aluno' | 'evento'
  aluno?: AlunoAgenda
  evento?: EventoAgendaRow
  dayIdx: number
  startMin: number
  duracao: number
}
interface ActiveBlock extends DragData { id: string }

interface DropTarget {
  dayIdx: number
  timeMin: number
  duracao: number
  valid: boolean
}

interface MoveConfirm {
  blockType: 'aluno' | 'evento'
  aluno?: AlunoAgenda
  evento?: EventoAgendaRow
  fromDayIdx: number
  fromTimeMin: number
  toDayIdx: number
  toTimeMin: number
  duracao: number
}

type Modal =
  | { type: 'add';         dayIdx: number; date: Date; timeMin: number }
  | { type: 'aluno-card';  aluno: AlunoAgenda; dayIdx: number; date: Date }
  | { type: 'evento-card'; evento: EventoAgendaRow; alunoNome?: string }
  | { type: 'edit';        evento: EventoAgendaRow }
  | { type: 'slots' }
  | { type: 'move-confirm'; confirm: MoveConfirm }
  | null

interface Props {
  alunos: AlunoAgenda[]
  eventosIniciais: EventoAgendaRow[]
  faltasIniciais: FaltaRow[]
  onGoToFaltas: () => void
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number); return h * 60 + m
}
function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function toPx(min: number): number { return min * MIN_PX }

function getWeekDays(offset: number): Date[] {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i); return d
  })
}

function formatDay(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

function computeLayout(blocks: { id: string; startMin: number; endMin: number }[]) {
  const result: Record<string, { left: number; width: number }> = {}
  blocks.forEach((b) => {
    const overlapping = blocks.filter((o) => o.id !== b.id && o.startMin < b.endMin && o.endMin > b.startMin)
    const group = [...overlapping, b].sort((a, c) => a.id < c.id ? -1 : 1)
    const colIdx = group.findIndex((g) => g.id === b.id)
    result[b.id] = { left: (colIdx / group.length) * 100, width: (1 / group.length) * 100 }
  })
  return result
}

function getFreeSlotsForDay(dayIdx: number, weekDays: Date[], alunos: AlunoAgenda[], eventos: EventoAgendaRow[]): string[] {
  const dayKey  = WEEK_KEYS[dayIdx]
  const cfg     = DAY_CFG[dayKey]
  const dateStr = toDateStr(weekDays[dayIdx])
  const busy: [number, number][] = []
  for (const a of alunos) {
    const h = a.horarios.find(x => x.dia === dayKey)
    if (h) {
      const s = timeToMin(h.horario); busy.push([s, s + a.duracao])
    }
  }
  for (const e of eventos) {
    if (e.dia_semana === dayKey || e.data_especifica === dateStr) {
      const s = timeToMin(e.horario_inicio); busy.push([s, s + e.duracao])
    }
  }
  const free: string[] = []
  for (let t = cfg.start; t + 30 <= cfg.end; t += 30) {
    if (!busy.some(([s, e]) => s < t + 30 && e > t)) free.push(minToTime(t))
  }
  return free
}

// ─── DraggableBlock ────────────────────────────────────────────────────────────

function DraggableBlock({
  isSource, style, className, onClick, onPointerDown, children,
}: {
  isSource?: boolean
  style?: React.CSSProperties
  className?: string
  onClick?: (e: React.MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  children: React.ReactNode
}) {
  return (
    <div
      data-block="true"
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{ ...style, opacity: isSource ? 0 : 1, touchAction: 'none', userSelect: 'none' }}
      className={className}
    >
      {children}
    </div>
  )
}

// ─── DroppableDay ──────────────────────────────────────────────────────────────

function DroppableDay({
  colRef, children, style, className, onClick, onMouseMove, onMouseLeave,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
}: {
  colRef?: (el: HTMLDivElement | null) => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave?: () => void
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      ref={colRef}
      style={style}
      className={className}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {children}
    </div>
  )
}

// ─── shared modal primitives ──────────────────────────────────────────────────

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-input)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

// ─── MoveConfirmModal ─────────────────────────────────────────────────────────

function MoveConfirmModal({
  confirm, onClose, onThisWeek, onPermanent, saving,
}: {
  confirm: MoveConfirm
  onClose: () => void
  onThisWeek: () => void
  onPermanent: () => void
  saving: boolean
}) {
  const [step, setStep] = useState<'confirm' | 'scope'>('confirm')
  const name      = confirm.aluno?.nome.split(' ')[0] ?? confirm.evento?.titulo ?? 'Evento'
  const fromLabel = `${WEEK_LABELS[confirm.fromDayIdx]}, ${minToTime(confirm.fromTimeMin)}`
  const toLabel   = `${WEEK_LABELS[confirm.toDayIdx]}, ${minToTime(confirm.toTimeMin)}`

  return (
    <Overlay onClose={onClose}>
      {step === 'confirm' ? (
        <>
          <ModalHeader title="Mover aula" onClose={onClose} />
          <div className="p-5 flex flex-col gap-4">
            <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                Mover aula de{' '}
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</span>
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{fromLabel}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>{toLabel}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                Cancelar
              </button>
              <button onClick={() => confirm.blockType === 'evento' ? onPermanent() : setStep('scope')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--green-primary)', color: '#000' }}
                disabled={saving}>
                {saving ? 'Movendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <ModalHeader title="Aplicar mudança" onClose={onClose} />
          <div className="p-5 flex flex-col gap-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Como aplicar a mudança para{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</span>?
            </p>
            <button onClick={onThisWeek} disabled={saving}
              className="w-full px-4 py-3.5 rounded-xl text-left cursor-pointer disabled:opacity-50 transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📅 Apenas esta semana</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Cria uma reposição no novo horário só para esta semana</p>
            </button>
            <button onClick={onPermanent} disabled={saving}
              className="w-full px-4 py-3.5 rounded-xl text-left cursor-pointer disabled:opacity-50 transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-primary)'; e.currentTarget.style.background = 'var(--green-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>🔄 Permanentemente</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Altera o horário fixo do aluno no cadastro</p>
            </button>
            {saving && (
              <div className="flex items-center justify-center gap-2 py-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--green-primary)" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Salvando...</span>
              </div>
            )}
          </div>
        </>
      )}
    </Overlay>
  )
}

// ─── AddEventModal ─────────────────────────────────────────────────────────────

function AddEventModal({
  dayIdx, date, timeMin, alunos, onClose, onSaved,
}: {
  dayIdx: number; date: Date; timeMin: number
  alunos: AlunoAgenda[]; onClose: () => void
  onSaved: (ev: EventoAgendaRow) => void
}) {
  const [step, setStep]         = useState<'choose' | 'aula' | 'reposicao' | 'aula_extra' | 'outro'>('choose')
  const [alunoId, setAlunoId]   = useState('')
  const [duracao, setDuracao]   = useState(60)
  const [titulo, setTitulo]     = useState('')
  const [tipo, setTipo]         = useState<EventoTipo>('outro')
  const [cor, setCor]           = useState(OUTRO_CORES[0])
  const [obs, setObs]           = useState('')
  const [valorExtra, setValorExtra] = useState('')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  // ── recurrence + free time (for "outro" step only) ─────────────────────────
  const [repetir, setRepetir] = useState(false)
  const defaultStart = minToTime(timeMin)
  const defaultEnd   = minToTime(Math.min(GRID_END, timeMin + 60))
  const [horaInicio, setHoraInicio] = useState<string>(defaultStart)
  const [horaFim,    setHoraFim]    = useState<string>(defaultEnd)
  const [diasSemana, setDiasSemana] = useState<DayKey[]>([WEEK_KEYS[dayIdx]])

  const dateStr  = toDateStr(date)
  const timeStr  = minToTime(timeMin)
  const dayLabel = `${WEEK_LABELS[dayIdx]} ${formatDay(date)}`
  const DURACAO_OPTS = [30, 45, 60, 90, 120]

  function toggleDia(k: DayKey) {
    setDiasSemana(prev => prev.includes(k) ? prev.filter(d => d !== k) : [...prev, k])
  }

  async function save() {
    setSaving(true); setErr('')
    let payload: Parameters<typeof createEventoAction>[0]
    if (step === 'aula' || step === 'reposicao') {
      const aluno = alunos.find(a => a.id === alunoId)
      if (!aluno) { setErr('Selecione um aluno.'); setSaving(false); return }
      payload = {
        tipo: step === 'aula' ? 'aula' : 'reposicao',
        titulo: `${step === 'aula' ? 'Aula' : 'Reposição'} — ${aluno.nome.split(' ')[0]}`,
        aluno_id: aluno.id, data_especifica: dateStr, horario_inicio: timeStr, duracao,
      }
    } else if (step === 'aula_extra') {
      const aluno = alunos.find(a => a.id === alunoId)
      if (!aluno) { setErr('Selecione um aluno.'); setSaving(false); return }
      const valorNum = parseFloat(valorExtra.replace(',', '.'))
      if (isNaN(valorNum) || valorNum <= 0) { setErr('Informe o valor da aula extra.'); setSaving(false); return }
      payload = {
        tipo: 'aula_extra',
        titulo: `Aula Extra — ${aluno.nome.split(' ')[0]}`,
        aluno_id: aluno.id, data_especifica: dateStr, horario_inicio: timeStr, duracao,
        cor: TIPO_COLOR.aula_extra, valor: valorNum,
      }
    } else {
      // ── "outros" step — supports free start/end time + weekly recurrence ─────
      if (!titulo.trim()) { setErr('Informe um título.'); setSaving(false); return }
      const iniMin = timeToMin(horaInicio)
      const fimMin = timeToMin(horaFim)
      const dur    = fimMin - iniMin
      if (!horaInicio || !horaFim || dur <= 0) {
        setErr('O horário de término deve ser maior que o de início.'); setSaving(false); return
      }

      if (repetir) {
        if (diasSemana.length === 0) {
          setErr('Selecione pelo menos um dia da semana.'); setSaving(false); return
        }
        const events = diasSemana.map(k => ({
          tipo,
          titulo: titulo.trim(),
          dia_semana: k,
          data_especifica: null,
          horario_inicio: horaInicio,
          duracao: dur,
          cor,
          observacao: obs.trim() || null,
        }))
        const res = await createEventoSerieAction(events)
        setSaving(false)
        if (res.error) { setErr(res.error); return }
        res.data!.forEach(onSaved)
        return
      }

      payload = {
        tipo, titulo: titulo.trim(),
        data_especifica: dateStr, horario_inicio: horaInicio, duracao: dur,
        cor, observacao: obs.trim() || null,
      }
    }
    const res = await createEventoAction(payload)
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(res.data!)
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Novo evento · ${dayLabel} · ${timeStr}`} onClose={onClose} />
      <div className="p-5 flex flex-col gap-4">
        {step === 'choose' && (
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'aula',       label: '📅 Marcar aula', color: TIPO_COLOR.aula },
              { id: 'reposicao',  label: '🔁 Reposição',   color: TIPO_COLOR.reposicao },
              { id: 'aula_extra', label: '⚡ Aula Extra',  color: TIPO_COLOR.aula_extra },
              { id: 'outro',      label: '➕ Outros',      color: TIPO_COLOR.outro },
            ] as const).map(opt => (
              <button key={opt.id} onClick={() => setStep(opt.id)}
                className="flex flex-col items-center gap-2 py-4 rounded-xl cursor-pointer transition-colors text-xs font-semibold"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: opt.color }}
                onMouseEnter={e => e.currentTarget.style.borderColor = opt.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {(step === 'aula' || step === 'reposicao' || step === 'aula_extra') && (
          <>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Aluno</label>
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
                {alunos.length === 0
                  ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhum aluno ativo</p>
                  : alunos.map(a => (
                    <label key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: alunoId === a.id ? 'var(--green-muted)' : 'var(--bg-card)', border: `1px solid ${alunoId === a.id ? 'rgba(16, 185, 129,0.2)' : 'var(--border-subtle)'}` }}>
                      <input type="radio" name="aluno" value={a.id} checked={alunoId === a.id}
                        onChange={() => { setAlunoId(a.id); setDuracao(a.duracao) }} className="accent-[#10B981]" />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.nome}</span>
                      <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{a.local}</span>
                    </label>
                  ))
                }
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Duração</label>
              <div className="flex gap-2">
                {DURACAO_OPTS.map(d => (
                  <button key={d} onClick={() => setDuracao(d)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ background: duracao === d ? 'var(--green-primary)' : 'var(--bg-card)', color: duracao === d ? '#000' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {d < 60 ? `${d}m` : d === 60 ? '1h' : d === 90 ? '1h30' : '2h'}
                  </button>
                ))}
              </div>
            </div>
            {step === 'aula_extra' && (
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Valor da aula extra (R$)
                </label>
                <input
                  type="number" min="0" step="0.01"
                  placeholder="Ex: 80.00"
                  value={valorExtra}
                  onChange={e => setValorExtra(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-focus)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Será somado na cobrança do próximo mês
                </p>
              </div>
            )}
          </>
        )}

        {step === 'outro' && (() => {
          const iniMin = timeToMin(horaInicio)
          const fimMin = timeToMin(horaFim)
          const durMin = fimMin - iniMin
          const durLabel = durMin > 0
            ? `${Math.floor(durMin / 60)}h${durMin % 60 ? String(durMin % 60).padStart(2, '0') : ''}`
            : '—'
          return (
            <>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Título</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Faculdade, Academia, Reunião..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tipo</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['reuniao','bloqueado','refeicao','outro'] as EventoTipo[]).map(t => (
                    <button key={t} onClick={() => { setTipo(t); setCor(TIPO_COLOR[t]) }}
                      className="py-2 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{ background: tipo === t ? TIPO_COLOR[t] + '22' : 'var(--bg-card)', color: TIPO_COLOR[t], border: `1px solid ${tipo === t ? TIPO_COLOR[t] : 'var(--border-subtle)'}` }}>
                      {TIPO_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Cor</label>
                <div className="flex gap-2">
                  {OUTRO_CORES.map(c => (
                    <button key={c} onClick={() => setCor(c)}
                      className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110"
                      style={{ background: c, outline: cor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
              </div>

              {/* Free start / end time + computed duration */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Horário</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>até</span>
                  <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Duração: <span style={{ color: durMin > 0 ? 'var(--text-primary)' : '#EF4444', fontWeight: 600 }}>{durLabel}</span>
                </p>
              </div>

              {/* Repetir toda semana — toggle + day picker */}
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Repetir toda semana</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Bloqueia o mesmo horário nos dias selecionados, semana após semana.
                    </p>
                  </div>
                  <input type="checkbox" checked={repetir} onChange={e => setRepetir(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-[#10B981] shrink-0 ml-3" />
                </label>

                {repetir && (
                  <>
                    <div className="grid grid-cols-7 gap-1 mt-3">
                      {WEEK_KEYS.map((k, i) => {
                        const active = diasSemana.includes(k)
                        return (
                          <button key={k} type="button" onClick={() => toggleDia(k)}
                            className="py-2 rounded-lg text-[11px] font-bold cursor-pointer"
                            style={{
                              background: active ? cor + '22' : 'var(--bg-input)',
                              color: active ? cor : 'var(--text-secondary)',
                              border: `1px solid ${active ? cor : 'var(--border-subtle)'}`,
                            }}>
                            {WEEK_LABELS[i]}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed flex gap-2"
                      style={{ background: 'rgba(56, 189, 248,0.08)', border: '1px solid rgba(56, 189, 248,0.2)', color: '#38BDF8' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      <span>
                        O evento permanecerá ocorrendo nos dias e horários selecionados
                        até que você apague manualmente.
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Observação (opcional)</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
              </div>
            </>
          )
        })()}

        {err && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{err}</p>}

        {step !== 'choose' && (
          <div className="flex gap-2">
            <button onClick={() => setStep('choose')}
              className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              ← Voltar
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: step === 'aula_extra' ? TIPO_COLOR.aula_extra : 'var(--green-primary)', color: '#000' }}>
              {saving ? 'Salvando...' : step === 'aula_extra' ? '⚡ Salvar Aula Extra' : 'Salvar'}
            </button>
          </div>
        )}
      </div>
    </Overlay>
  )
}

// ─── AlunoCardModal ─────────────────────────────────────────────────────────────

type SelectedFaltaTipo = 'aluno-faltou' | 'cancelamento' | 'professor-cancelou'
type AlunoModalStep    = 'menu' | 'obs' | 'options' | 'credito' | 'cobranca-confirm' | 'done'

const FALTA_TIPO_CFG: Record<SelectedFaltaTipo, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  'aluno-faltou':       { label: 'Aluno faltou',                 emoji: '🔴', color: FALTA_COLOR,        bg: 'rgba(239, 68, 68,0.06)',   border: 'rgba(239, 68, 68,0.25)' },
  'cancelamento':       { label: 'Cancelamento com antecedência', emoji: '🟠', color: CANCELAMENTO_COLOR, bg: 'rgba(245, 158, 11,0.06)',   border: 'rgba(245, 158, 11,0.25)' },
  'professor-cancelou': { label: 'Professor cancelou',            emoji: '🟣', color: PROFESSOR_COLOR,    bg: 'rgba(139, 92, 246,0.06)', border: 'rgba(139, 92, 246,0.25)' },
}

function faltaCreateParams(t: SelectedFaltaTipo): { culpa: 'aluno' | 'professor'; tipo: 'falta' | 'cancelamento' } {
  if (t === 'cancelamento')       return { culpa: 'aluno',     tipo: 'cancelamento' }
  if (t === 'professor-cancelou') return { culpa: 'professor', tipo: 'falta' }
  return { culpa: 'aluno', tipo: 'falta' }
}

function AlunoCardModal({
  aluno, dayIdx, date, eventos, prazoFaltaDias, faltasData, onClose, onReagendar, onFaltaRegistrada, onGoToFaltas,
}: {
  aluno: AlunoAgenda; dayIdx: number; date: Date
  eventos: EventoAgendaRow[]
  prazoFaltaDias: number
  faltasData: FaltaRow[]
  onClose: () => void
  onReagendar: () => void
  onFaltaRegistrada: (f: FaltaRow) => void
  onGoToFaltas: () => void
}) {
  const [step,        setStep]        = useState<AlunoModalStep>('menu')
  const [faltaTipo,   setFaltaTipo]   = useState<SelectedFaltaTipo | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [obs,         setObs]         = useState(aluno.observacoes ?? '')
  const [creditoValor, setCreditoValor] = useState('')
  const [doneMsg,     setDoneMsg]     = useState('')
  const [err,         setErr]         = useState('')
  const supabase = createClient()

  const dateStr      = toDateStr(date)
  const dayKey       = WEEK_KEYS[dayIdx]
  const alunoHorario = aluno.horarios.find(x => x.dia === dayKey)?.horario ?? '08:00'

  // Check if there's already a falta for this aluno on this date
  const existingFalta = faltasData.find(f => f.aluno_id === aluno.id && f.data_falta === dateStr)
  const existingColor = existingFalta
    ? (existingFalta.tipo === 'cancelamento' ? CANCELAMENTO_COLOR : existingFalta.culpa === 'professor' ? PROFESSOR_COLOR : FALTA_COLOR)
    : null
  const existingEmoji = existingFalta
    ? (existingFalta.tipo === 'cancelamento' ? '🟠' : existingFalta.culpa === 'professor' ? '🟣' : '🔴')
    : null
  const existingLabel = existingFalta
    ? (existingFalta.tipo === 'cancelamento' ? 'Cancelamento antecipado' : existingFalta.culpa === 'professor' ? 'Professor cancelou' : 'Aluno faltou')
    : null

  const PLANO_LABEL: Record<string, string> = { por_aula: 'Por aula', mensalidade: 'Mensalidade' }

  // ── create falta helper ──────────────────────────────────────────────────────
  async function createFalta(t: SelectedFaltaTipo): Promise<FaltaRow | null> {
    const params = faltaCreateParams(t)
    const res = await createFaltaAction({
      aluno_id: aluno.id,
      data_falta: dateStr,
      culpa: params.culpa,
      tipo: params.tipo,
      horario_falta: alunoHorario,
      prazo_dias: prazoFaltaDias,
    })
    if (res.error) { setErr(res.error); return null }
    onFaltaRegistrada(res.data!)
    return res.data!
  }

  // ── handlers ────────────────────────────────────────────────────────────────
  function handleSelectTipo(t: SelectedFaltaTipo) {
    setFaltaTipo(t); setErr(''); setStep('options')
  }

  async function handleRemarcar() {
    if (!faltaTipo) return
    setSaving(true); setErr('')
    const falta = await createFalta(faltaTipo)
    setSaving(false)
    if (!falta) return
    onClose(); onGoToFaltas()
  }

  function handleGerarcredito() { setStep('credito') }

  async function handleConfirmCredito() {
    if (!faltaTipo) return
    const val = parseFloat(creditoValor.replace(',', '.'))
    if (!val || val <= 0) { setErr('Informe um valor de crédito válido.'); return }
    setSaving(true); setErr('')
    const falta = await createFalta(faltaTipo)
    if (!falta) { setSaving(false); return }
    const r2 = await resolveFaltaAction(falta.id, { tipo: 'credito', credito_valor: val })
    setSaving(false)
    if (r2.error) { setErr(r2.error); return }
    onFaltaRegistrada({ ...falta, status: 'credito', credito_valor: val })
    setDoneMsg('Crédito gerado! Será descontado na cobrança do próximo mês.')
    setStep('done')
  }

  async function handleManterCobranca() {
    if (!faltaTipo) return
    setSaving(true); setErr('')
    const falta = await createFalta(faltaTipo)
    if (!falta) { setSaving(false); return }
    const r2 = await resolveFaltaAction(falta.id, { tipo: 'cobranca' })
    setSaving(false)
    if (r2.error) { setErr(r2.error); return }
    onFaltaRegistrada({ ...falta, status: 'cobranca' })
    setDoneMsg('Cobrança mantida. Nenhum crédito ou remarcação foi gerado.')
    setStep('done')
  }

  async function handleSaveObs() {
    setSaving(true)
    await supabase.from('alunos').update({ observacoes: obs }).eq('id', aluno.id)
    setSaving(false); setStep('menu')
  }

  // ── Info grid ────────────────────────────────────────────────────────────────
  const infoGrid = (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: 'Horário', value: `${alunoHorario} (${aluno.duracao}min)` },
        { label: 'Local',   value: aluno.local || '—' },
        { label: 'Plano',   value: PLANO_LABEL[aluno.modelo_cobranca] ?? aluno.modelo_cobranca },
        { label: 'Data',    value: `${WEEK_LABELS[dayIdx]} ${formatDay(date)}` },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
      ))}
    </div>
  )

  // ── tipo context badge (shown in options / credito steps) ────────────────────
  const tipoBadge = faltaTipo ? (() => {
    const cfg = FALTA_TIPO_CFG[faltaTipo]
    return (
      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <p className="font-semibold" style={{ color: cfg.color }}>{cfg.emoji} {cfg.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {aluno.nome.split(' ')[0]} · {WEEK_LABELS[dayIdx]} {formatDay(date)} · {alunoHorario}
        </p>
      </div>
    )
  })() : null

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={aluno.nome} onClose={onClose} />
      <div className="p-5 flex flex-col gap-4">

        {/* STEP: menu */}
        {step === 'menu' && (
          <>
            {infoGrid}
            {aluno.observacoes && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Observações</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{aluno.observacoes}</p>
              </div>
            )}
            {existingFalta ? (
              <div className="rounded-xl px-3 py-2.5 text-xs font-medium flex items-center gap-2"
                style={{ background: `${existingColor}1A`, color: existingColor!, border: `1px solid ${existingColor}40` }}>
                <span>{existingEmoji}</span>
                <span>{existingLabel} já registrado neste dia</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button onClick={() => handleSelectTipo('aluno-faltou')}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer text-left px-4 flex items-center gap-3"
                  style={{ background: 'rgba(239, 68, 68,0.08)', color: FALTA_COLOR, border: '1px solid rgba(239, 68, 68,0.25)' }}>
                  <span className="text-base">🔴</span>
                  <div>
                    <div>Aluno faltou</div>
                    <div className="text-xs font-normal opacity-70">Não compareceu sem avisar</div>
                  </div>
                </button>
                <button onClick={() => handleSelectTipo('cancelamento')}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer text-left px-4 flex items-center gap-3"
                  style={{ background: 'rgba(245, 158, 11,0.08)', color: CANCELAMENTO_COLOR, border: '1px solid rgba(245, 158, 11,0.25)' }}>
                  <span className="text-base">🟠</span>
                  <div>
                    <div>Cancelamento com antecedência</div>
                    <div className="text-xs font-normal opacity-70">Aluno avisou com antecedência</div>
                  </div>
                </button>
                <button onClick={() => handleSelectTipo('professor-cancelou')}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer text-left px-4 flex items-center gap-3"
                  style={{ background: 'rgba(139, 92, 246,0.08)', color: PROFESSOR_COLOR, border: '1px solid rgba(139, 92, 246,0.25)' }}>
                  <span className="text-base">🟣</span>
                  <div>
                    <div>Professor cancelou</div>
                    <div className="text-xs font-normal opacity-70">O professor não pôde dar a aula</div>
                  </div>
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onReagendar}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'rgba(56, 189, 248,0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248,0.2)' }}>
                ↺ Reagendar
              </button>
              <button onClick={() => setStep('obs')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                📝 Observação
              </button>
            </div>
          </>
        )}

        {/* STEP: obs */}
        {step === 'obs' && (
          <>
            {infoGrid}
            <div className="flex flex-col gap-2">
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-focus)', color: 'var(--text-primary)' }} />
              <div className="flex gap-2">
                <button onClick={() => setStep('menu')}
                  className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  ← Voltar
                </button>
                <button onClick={handleSaveObs} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--green-primary)', color: '#000' }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* STEP: options — 3 resolution choices */}
        {step === 'options' && faltaTipo && (
          <>
            {tipoBadge}
            <div className="flex flex-col gap-2">
              <button onClick={handleRemarcar} disabled={saving}
                className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {saving ? 'Registrando...' : 'Remarcar'}
              </button>
              <button onClick={handleGerarcredito} disabled={saving}
                className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'rgba(56, 189, 248,0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Gerar Crédito
              </button>
              <button onClick={handleManterCobranca} disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                💵 Manter Cobrança
              </button>
            </div>
            {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}
            <button onClick={() => setStep('menu')} className="py-2 rounded-xl text-sm cursor-pointer"
              style={{ background: 'transparent', color: 'var(--text-muted)' }}>
              ← Voltar
            </button>
          </>
        )}

        {/* STEP: credito */}
        {step === 'credito' && faltaTipo && (
          <>
            {tipoBadge}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                Valor do crédito (R$)
              </label>
              <input
                type="text" inputMode="decimal" placeholder="Ex: 80,00"
                value={creditoValor}
                onChange={e => setCreditoValor(e.target.value)}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                O crédito será descontado na cobrança do próximo mês.
              </p>
            </div>
            {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setStep('options'); setErr('') }}
                className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                ← Voltar
              </button>
              <button onClick={handleConfirmCredito} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: '#38BDF822', color: '#38BDF8', border: '1px solid rgba(56, 189, 248,0.3)' }}>
                {saving ? 'Salvando...' : '💳 Confirmar Crédito'}
              </button>
            </div>
          </>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <>
            <div className="rounded-xl p-4 text-center flex flex-col gap-2"
              style={{ background: 'rgba(16, 185, 129,0.06)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
              <p className="text-2xl">✅</p>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrado!</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{doneMsg}</p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--green-primary)', color: '#000' }}>
              Fechar
            </button>
          </>
        )}

      </div>
    </Overlay>
  )
}

// ─── EventoCardModal ───────────────────────────────────────────────────────────

function EventoCardModal({
  evento, alunoNome, onClose, onDeleted, onDeletedSerie, onEditar,
}: {
  evento: EventoAgendaRow; alunoNome?: string
  onClose: () => void
  onDeleted: (id: string) => void
  onDeletedSerie: (ids: string[]) => void
  onEditar: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const color = evento.cor ?? TIPO_COLOR[evento.tipo]
  const isSerie = !!evento.serie_id

  async function handleDeleteSingle() {
    setSaving(true)
    await deleteEventoAction(evento.id)
    setSaving(false); onDeleted(evento.id); onClose()
  }

  async function handleDeleteSerie() {
    if (!evento.serie_id) return
    setSaving(true)
    const res = await deleteEventoSerieAction(evento.serie_id)
    setSaving(false)
    if (res.error) return
    onDeletedSerie(res.deletedIds ?? [])
    onClose()
  }

  function triggerDelete() {
    if (isSerie) { setConfirmDelete(true); return }
    if (!confirm('Remover este evento?')) return
    handleDeleteSingle()
  }

  return (
    <Overlay onClose={onClose}>
      <div className="h-1.5 rounded-t-2xl" style={{ background: color }} />
      <ModalHeader title={evento.titulo} onClose={onClose} />
      <div className="p-5 flex flex-col gap-3">

        {!confirmDelete && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Tipo',     value: TIPO_LABEL[evento.tipo] },
                { label: 'Horário',  value: `${evento.horario_inicio} (${evento.duracao}min)` },
                evento.data_especifica
                  ? { label: 'Data',     value: evento.data_especifica.split('-').reverse().join('/') }
                  : { label: 'Dia fixo', value: WEEK_LABELS[WEEK_KEYS.indexOf(evento.dia_semana as DayKey)] ?? evento.dia_semana ?? '—' },
                { label: 'Aluno',    value: alunoNome ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>

            {isSerie && (
              <div className="rounded-xl px-3 py-2.5 text-xs flex gap-2"
                style={{ background: 'rgba(56, 189, 248,0.08)', border: '1px solid rgba(56, 189, 248,0.2)', color: '#38BDF8' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span>Evento recorrente — repete toda semana</span>
              </div>
            )}

            {evento.observacao && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Observação</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{evento.observacao}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onEditar}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                ✏ Editar
              </button>
              <button onClick={triggerDelete} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'rgba(239, 68, 68,0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68,0.2)' }}>
                {saving ? '...' : '🗑 Remover'}
              </button>
            </div>
          </>
        )}

        {/* ─── Confirm delete for recurring series ──────────────────────── */}
        {confirmDelete && (
          <>
            <div className="rounded-xl p-3" style={{ background: 'rgba(239, 68, 68,0.06)', border: '1px solid rgba(239, 68, 68,0.2)' }}>
              <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>Remover evento recorrente</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Este evento faz parte de uma série que se repete toda semana.
                O que você deseja remover?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleDeleteSingle} disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 text-left px-4"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                <div>Apenas este</div>
                <div className="text-xs font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Remove só este evento; os demais dias continuam.
                </div>
              </button>
              <button onClick={handleDeleteSerie} disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 text-left px-4"
                style={{ background: 'rgba(239, 68, 68,0.08)', color: '#EF4444', border: '1px solid rgba(239, 68, 68,0.25)' }}>
                <div>Todos os seguintes (iguais)</div>
                <div className="text-xs font-normal mt-0.5 opacity-80">
                  Remove todos os dias desta série — o bloqueio deixa de acontecer.
                </div>
              </button>
            </div>
            <button onClick={() => setConfirmDelete(false)} disabled={saving}
              className="py-2 rounded-xl text-sm cursor-pointer"
              style={{ background: 'transparent', color: 'var(--text-muted)' }}>
              ← Voltar
            </button>
          </>
        )}

      </div>
    </Overlay>
  )
}

// ─── EditEventoModal ───────────────────────────────────────────────────────────

function EditEventoModal({
  evento, onClose, onSaved,
}: {
  evento: EventoAgendaRow; onClose: () => void; onSaved: (ev: EventoAgendaRow) => void
}) {
  const [titulo,  setTitulo]  = useState(evento.titulo)
  const [duracao, setDuracao] = useState(evento.duracao)
  const [hora,    setHora]    = useState(evento.horario_inicio)
  const [obs,     setObs]     = useState(evento.observacao ?? '')
  const [cor,     setCor]     = useState(evento.cor ?? TIPO_COLOR[evento.tipo])
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  async function save() {
    setSaving(true); setErr('')
    const res = await updateEventoAction(evento.id, { titulo: titulo.trim(), duracao, horario_inicio: hora, observacao: obs.trim() || null, cor })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(res.data!); onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Editar evento" onClose={onClose} />
      <div className="p-5 flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Título</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Horário</label>
            <input type="time" value={hora} onChange={e => setHora(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Duração</label>
            <select value={duracao} onChange={e => setDuracao(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              {[30,45,60,90,120].map(d => <option key={d} value={d}>{d < 60 ? `${d}min` : d === 60 ? '1h' : d === 90 ? '1h30' : '2h'}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Cor</label>
          <div className="flex gap-2">
            {[...new Set([...OUTRO_CORES, TIPO_COLOR.aula, TIPO_COLOR.reposicao])].map(c => (
              <button key={c} onClick={() => setCor(c)}
                className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110"
                style={{ background: c, outline: cor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Observação</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
        </div>
        {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}
        <button onClick={save} disabled={saving}
          className="py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: 'var(--green-primary)', color: '#000' }}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </Overlay>
  )
}

// ─── AvailableSlotsModal ───────────────────────────────────────────────────────

function AvailableSlotsModal({
  weekDays, alunos, eventos, onClose, onSlotClick,
}: {
  weekDays: Date[]; alunos: AlunoAgenda[]; eventos: EventoAgendaRow[]
  onClose: () => void; onSlotClick: (dayIdx: number, date: Date, timeMin: number) => void
}) {
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Horários disponíveis" onClose={onClose} />
      <div className="p-4 overflow-y-auto max-h-[70vh] flex flex-col gap-3">
        {weekDays.map((day, dayIdx) => {
          const slots = getFreeSlotsForDay(dayIdx, weekDays, alunos, eventos)
          return (
            <div key={dayIdx}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                {WEEK_LABELS[dayIdx]} {formatDay(day)}
              </p>
              {slots.length === 0
                ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Dia cheio</p>
                : (
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map(s => (
                      <button key={s} onClick={() => { onClose(); onSlotClick(dayIdx, day, timeToMin(s)) }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer"
                        style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )
              }
            </div>
          )
        })}
      </div>
    </Overlay>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export function AgendaSemanal({ alunos, eventosIniciais, faltasIniciais, onGoToFaltas }: Props) {
  const [weekOffset, setWeekOffset]     = useState(0)
  const [eventos, setEventos]           = useState<EventoAgendaRow[]>(eventosIniciais)
  const [faltas,  setFaltas]            = useState<FaltaRow[]>(faltasIniciais)
  // Default prazo_dias=30 (used when creating faltas from agenda — loaded from prefs via state)
  const prazoFaltaDias = 30
  const [modal, setModal]               = useState<Modal>(null)
  const [mobileDayIdx, setMobileDayIdx] = useState(() => {
    const d = new Date().getDay(); return d === 0 ? 6 : d - 1
  })
  const [hoverPos, setHoverPos]         = useState<{ dayIdx: number; y: number; timeMin: number } | null>(null)
  const [loadingWeek, setLoadingWeek]   = useState(false)

  // ── current time line ────────────────────────────────────────────────────────
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  // ── DnD state ───────────────────────────────────────────────────────────────
  const [activeBlock, setActiveBlock]   = useState<ActiveBlock | null>(null)
  const [dropTarget, setDropTarget]     = useState<DropTarget | null>(null)
  const [moveSaving, setMoveSaving]     = useState(false)
  const [overlayXY, setOverlayXY]       = useState<{ x: number; y: number } | null>(null)
  const [mobileView, setMobileView]     = useState<'dia' | 'semana'>('dia')

  useEffect(() => {
    const stored = localStorage.getItem('agenda-mobile-view')
    if (stored === 'dia' || stored === 'semana') setMobileView(stored)
  }, [])

  function changeMobileView(v: 'dia' | 'semana') {
    setMobileView(v)
    localStorage.setItem('agenda-mobile-view', v)
  }

  // Manual DnD refs
  const grabOffsetRef       = useRef({ x: 0, y: 0 })
  const dragDataRef         = useRef<DragData | null>(null)
  const isDraggingRef       = useRef(false)   // true once pointer moves > threshold
  const pointerStartRef     = useRef({ x: 0, y: 0 })
  const isMobileWeekDragRef = useRef(false)   // true when drag is in compact week view
  const longPressTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 7 column refs — desktop/dia view (index matches WEEK_KEYS)
  const colRefs        = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null))
  // 7 column refs — compact mobile week view
  const compactColRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null))
  // scroll container ref for scroll helper
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Helper: find which column a clientX falls in and return {dayIdx, rect}
  function findColumn(clientX: number) {
    for (let i = 0; i < colRefs.current.length; i++) {
      const el = colRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) return { dayIdx: i, rect }
    }
    return null
  }

  function findCompactColumn(clientX: number) {
    for (let i = 0; i < compactColRefs.current.length; i++) {
      const el = compactColRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) return { dayIdx: i, rect }
    }
    return null
  }

  // Add window pointermove + pointerup when a drag is active
  useEffect(() => {
    if (!activeBlock) { setOverlayXY(null); return }

    function onPointerMove(e: PointerEvent) {
      const dx = e.clientX - pointerStartRef.current.x
      const dy = e.clientY - pointerStartRef.current.y

      // Activation threshold: 6px total movement
      if (!isDraggingRef.current) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return
        isDraggingRef.current = true
      }

      // Update ghost overlay position
      setOverlayXY({
        x: e.clientX - grabOffsetRef.current.x,
        y: e.clientY - grabOffsetRef.current.y,
      })

      // Compute drop target
      const data = dragDataRef.current
      if (!data) return
      const activePx = isMobileWeekDragRef.current ? COMPACT_MIN_PX : MIN_PX
      const col = isMobileWeekDragRef.current ? findCompactColumn(e.clientX) : findColumn(e.clientX)
      if (!col) { setDropTarget(null); return }
      const yInCol  = (e.clientY - grabOffsetRef.current.y) - col.rect.top
      const rawMin  = GRID_START + yInCol / activePx
      const snapped = Math.round(rawMin / 30) * 30
      const cfg     = DAY_CFG[WEEK_KEYS[col.dayIdx]]
      const clamped = Math.max(cfg.start, Math.min(cfg.end - data.duracao, snapped))
      const valid   = snapped >= cfg.start && (snapped + data.duracao) <= cfg.end
      setDropTarget({ dayIdx: col.dayIdx, timeMin: clamped, duracao: data.duracao, valid })
    }

    function onPointerUp(e: PointerEvent) {
      const wasDragging = isDraggingRef.current
      const data = dragDataRef.current

      // Reset drag state
      isDraggingRef.current = false
      dragDataRef.current   = null
      setActiveBlock(null)
      setDropTarget(null)

      if (!wasDragging || !data) return

      const activePx  = isMobileWeekDragRef.current ? COMPACT_MIN_PX : MIN_PX
      const col = isMobileWeekDragRef.current ? findCompactColumn(e.clientX) : findColumn(e.clientX)
      if (!col) return

      const yInCol   = (e.clientY - grabOffsetRef.current.y) - col.rect.top
      const rawMin   = GRID_START + yInCol / activePx
      const snapped  = Math.round(rawMin / 30) * 30
      const newDayKey = WEEK_KEYS[col.dayIdx]
      const cfg       = DAY_CFG[newDayKey]

      if (snapped < cfg.start || snapped + data.duracao > cfg.end) return
      const clamped = Math.max(cfg.start, Math.min(cfg.end - data.duracao, snapped))
      if (clamped === data.startMin && col.dayIdx === data.dayIdx) return

      if (data.blockType === 'evento' && data.evento) {
        setModal({
          type: 'move-confirm',
          confirm: {
            blockType: 'evento',
            evento: data.evento,
            fromDayIdx: data.dayIdx,
            fromTimeMin: data.startMin,
            toDayIdx: col.dayIdx,
            toTimeMin: clamped,
            duracao: data.duracao,
          },
        })
      } else if (data.blockType === 'aluno' && data.aluno) {
        setModal({
          type: 'move-confirm',
          confirm: {
            blockType: 'aluno',
            aluno: data.aluno,
            fromDayIdx: data.dayIdx,
            fromTimeMin: data.startMin,
            toDayIdx: col.dayIdx,
            toTimeMin: clamped,
            duracao: data.duracao,
          },
        })
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlock])

  const isFirstMount = useRef(true)
  const weekDays     = getWeekDays(weekOffset)
  const todayStr     = toDateStr(new Date())

  // ── Fetch eventos on week change ─────────────────────────────────────────────
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setLoadingWeek(true)
    const supabase = createClient()
    const start = toDateStr(weekDays[0])
    const end   = toDateStr(weekDays[6])
    supabase
      .from('eventos_agenda')
      .select('*')
      .or(`dia_semana.not.is.null,and(data_especifica.gte.${start},data_especifica.lte.${end})`)
      .then(({ data }) => { setEventos(data ?? []); setLoadingWeek(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  // ── data mutators ────────────────────────────────────────────────────────────
  const addEvento    = (ev: EventoAgendaRow) => setEventos(p => [...p, ev])
  const updateEvento = (ev: EventoAgendaRow) => setEventos(p => p.map(e => e.id === ev.id ? ev : e))
  const removeEvento = (id: string)          => setEventos(p => p.filter(e => e.id !== id))

  // ── scroll helpers ────────────────────────────────────────────────────────────

  function scrollToMinOffset(totalMin: number) {
    if (!scrollContainerRef.current) return
    const minFromStart = totalMin - GRID_START
    const px = mobileView === 'semana' ? minFromStart * COMPACT_MIN_PX : minFromStart * MIN_PX
    scrollContainerRef.current.scrollTo({ top: Math.max(0, px), behavior: 'smooth' })
  }

  function scrollToHour(hour: number) { scrollToMinOffset(hour * 60) }

  function scrollToNow() {
    const n = new Date()
    scrollToMinOffset(n.getHours() * 60 + n.getMinutes())
  }

  // Auto-scroll to current time on mount + update the time line every 60 s
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const n   = new Date()
        const min = n.getHours() * 60 + n.getMinutes()
        if (min >= GRID_START && min <= GRID_END) {
          const px     = (min - GRID_START) * MIN_PX
          const offset = Math.max(0, px - scrollContainerRef.current.clientHeight * 0.4)
          scrollContainerRef.current.scrollTop = offset
        }
      }
    })
    const interval = setInterval(() => {
      const n = new Date()
      setNowMin(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => { cancelAnimationFrame(raf); clearInterval(interval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── DnD handlers ─────────────────────────────────────────────────────────────

  function handleTouchLongPress(
    blockId: string,
    data: DragData,
    grabOffset: { x: number; y: number },
    startXY: { x: number; y: number },
    isCompact: boolean,
  ) {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startXY.x
      const dy = ev.clientY - startXY.y
      if (Math.abs(dx) + Math.abs(dy) > 10) cancel()
    }
    function onUp() { cancel() }
    function cancel() {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    longPressTimerRef.current = setTimeout(() => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      grabOffsetRef.current       = grabOffset
      pointerStartRef.current     = startXY
      isDraggingRef.current       = true
      dragDataRef.current         = data
      isMobileWeekDragRef.current = isCompact
      setActiveBlock({ ...data, id: blockId })
      setOverlayXY({ x: startXY.x - grabOffset.x, y: startXY.y - grabOffset.y })
      setModal(null)
    }, 500)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
  }

  function handleBlockPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    blockId: string,
    data: DragData,
    isCompact = false,
  ) {
    // Don't start drag if a modal is open
    if (modal) return
    const rect = e.currentTarget.getBoundingClientRect()
    const grabOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    if (e.pointerType === 'touch') {
      handleTouchLongPress(blockId, data, grabOffset, { x: e.clientX, y: e.clientY }, isCompact)
      return
    }

    // Mouse / stylus: immediate drag
    grabOffsetRef.current       = grabOffset
    pointerStartRef.current     = { x: e.clientX, y: e.clientY }
    isDraggingRef.current       = false
    dragDataRef.current         = data
    isMobileWeekDragRef.current = isCompact
    setActiveBlock({ ...data, id: blockId })
    // Ghost starts at the block's current position
    setOverlayXY({ x: rect.left, y: rect.top })
    setModal(null)
  }

  // ── move handlers ─────────────────────────────────────────────────────────────

  async function handleMoveEvento(confirm: MoveConfirm) {
    if (!confirm.evento) return
    setMoveSaving(true)
    const ev         = confirm.evento
    const newDayKey  = WEEK_KEYS[confirm.toDayIdx]
    const newDateStr = toDateStr(weekDays[confirm.toDayIdx])
    const update: Parameters<typeof updateEventoAction>[1] = {
      horario_inicio: minToTime(confirm.toTimeMin),
      ...(ev.data_especifica ? { data_especifica: newDateStr } : { dia_semana: newDayKey }),
    }
    const res = await updateEventoAction(ev.id, update)
    setMoveSaving(false)
    if (res.data) updateEvento(res.data)
    setModal(null)
  }

  async function handleMoveAlunoThisWeek(confirm: MoveConfirm) {
    if (!confirm.aluno) return
    setMoveSaving(true)
    const a          = confirm.aluno
    const oldDateStr = toDateStr(weekDays[confirm.fromDayIdx])
    const newDateStr = toDateStr(weekDays[confirm.toDayIdx])
    const [r1, r2]   = await Promise.all([
      createEventoAction({
        tipo: 'bloqueado', titulo: `Cancelado — ${a.nome.split(' ')[0]}`,
        aluno_id: a.id, data_especifica: oldDateStr,
        horario_inicio: a.horarios.find(x => x.dia === WEEK_KEYS[confirm.fromDayIdx])?.horario ?? '08:00', duracao: a.duracao,
      }),
      createEventoAction({
        tipo: 'aula', titulo: `Reposição — ${a.nome.split(' ')[0]}`,
        aluno_id: a.id, data_especifica: newDateStr,
        horario_inicio: minToTime(confirm.toTimeMin), duracao: confirm.duracao,
      }),
    ])
    setMoveSaving(false)
    if (r1.data) addEvento(r1.data)
    if (r2.data) addEvento(r2.data)
    setModal(null)
  }

  async function handleMoveAlunoPermanent(confirm: MoveConfirm) {
    if (!confirm.aluno) return
    setMoveSaving(true)
    const res = await updateAlunoScheduleAction(
      confirm.aluno.id,
      WEEK_KEYS[confirm.fromDayIdx],
      WEEK_KEYS[confirm.toDayIdx],
      minToTime(confirm.toTimeMin)
    )
    setMoveSaving(false)
    if (!res.error) { setModal(null); window.location.reload() }
  }

  // ── column click / hover (non-drag interactions) ─────────────────────────────

  // Press state — used to show the placement indicator while the user holds
  // their finger/mouse on an empty column cell (mobile-friendly snap preview).
  const pressTrackingRef = useRef<{ dayIdx: number; pxScale: number } | null>(null)

  function snapTimeFromEvent(clientY: number, rectTop: number, pxScale: number): number {
    const raw = GRID_START + (clientY - rectTop) / pxScale
    return Math.round(raw / 30) * 30
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
    if ((e.target as HTMLElement).closest('[data-block]')) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const snapped = snapTimeFromEvent(e.clientY, rect.top, MIN_PX)
    const cfg     = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) return
    setHoverPos(null)
    setModal({ type: 'add', dayIdx, date: weekDays[dayIdx], timeMin: snapped })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
    if ((e.target as HTMLElement).closest('[data-block]') || activeBlock) { setHoverPos(null); return }
    const rect    = e.currentTarget.getBoundingClientRect()
    const snapped = snapTimeFromEvent(e.clientY, rect.top, MIN_PX)
    const cfg     = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) { setHoverPos(null); return }
    setHoverPos({ dayIdx, y: toPx(snapped - GRID_START), timeMin: snapped })
  }

  // Pointer handlers — provide press-to-preview (essential for touch devices,
  // where the user can't hover to see which 30-min slot they'll land on).
  function handleColumnPointerDown(e: React.PointerEvent<HTMLDivElement>, dayIdx: number, pxScale: number) {
    if ((e.target as HTMLElement).closest('[data-block]') || activeBlock) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const snapped = snapTimeFromEvent(e.clientY, rect.top, pxScale)
    const cfg     = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) { setHoverPos(null); return }
    pressTrackingRef.current = { dayIdx, pxScale }
    setHoverPos({ dayIdx, y: (snapped - GRID_START) * pxScale, timeMin: snapped })
  }

  function handleColumnPointerMove(e: React.PointerEvent<HTMLDivElement>, dayIdx: number, pxScale: number) {
    // Only update during an active press — otherwise desktop's onMouseMove handles it.
    if (!pressTrackingRef.current || pressTrackingRef.current.dayIdx !== dayIdx) return
    if ((e.target as HTMLElement).closest('[data-block]') || activeBlock) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const snapped = snapTimeFromEvent(e.clientY, rect.top, pxScale)
    const cfg     = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) return
    setHoverPos({ dayIdx, y: (snapped - GRID_START) * pxScale, timeMin: snapped })
  }

  function handleColumnPointerUp() {
    pressTrackingRef.current = null
    // keep hoverPos until onClick fires (which clears it) or mouseleave hits
  }

  function handleColumnPointerCancel() {
    pressTrackingRef.current = null
    setHoverPos(null)
  }

  // ── grid rendering ─────────────────────────────────────────────────────────

  const hourLabels  = Array.from({ length: 17 }, (_, i) => ({ label: `${i+6}:00`, top: toPx((i+6)*60 - GRID_START) }))
  const gridHeight  = toPx(GRID_TOTAL)

  function renderDayColumn(dayIdx: number) {
    const dayKey  = WEEK_KEYS[dayIdx]
    const cfg     = DAY_CFG[dayKey]
    const dateStr = toDateStr(weekDays[dayIdx])
    const day     = weekDays[dayIdx]

    type BlockItem = {
      id: string; startMin: number; endMin: number
      isAluno: boolean; aluno?: AlunoAgenda; evento?: EventoAgendaRow
    }
    const allBlocks: BlockItem[] = []

    // Aluno blocks (skip if cancelled)
    for (const a of alunos) {
      const h = a.horarios.find(x => x.dia === dayKey)
      if (!h) continue
      const startMin    = timeToMin(h.horario)
      const isCancelled = eventos.some(e =>
        e.tipo === 'bloqueado' && e.data_especifica === dateStr &&
        timeToMin(e.horario_inicio) === startMin
      )
      if (isCancelled) continue
      allBlocks.push({ id: `a-${a.id}`, startMin, endMin: startMin + a.duracao, isAluno: true, aluno: a })
    }
    // Evento blocks
    for (const ev of eventos) {
      if (ev.dia_semana !== dayKey && ev.data_especifica !== dateStr) continue
      const startMin = timeToMin(ev.horario_inicio)
      allBlocks.push({ id: `e-${ev.id}`, startMin, endMin: startMin + ev.duracao, isAluno: false, evento: ev })
    }

    const layout       = computeLayout(allBlocks)
    const closedTop    = toPx(cfg.start - GRID_START)
    const closedBottom = toPx(GRID_END - cfg.end)
    const isHovered    = hoverPos?.dayIdx === dayIdx
    const isToday      = dateStr === todayStr

    // Drop highlight in this column
    const dropHere = dropTarget?.dayIdx === dayIdx ? dropTarget : null

    return (
      <DroppableDay
        key={dayIdx}
        colRef={(el) => { colRefs.current[dayIdx] = el }}
        className="relative flex-1 border-l cursor-crosshair min-w-0"
        style={{ height: gridHeight, borderColor: 'var(--border-subtle)', minWidth: 120 }}
        onClick={(e) => handleColumnClick(e, dayIdx)}
        onMouseMove={(e) => handleMouseMove(e, dayIdx)}
        onMouseLeave={() => { if (!pressTrackingRef.current) setHoverPos(null) }}
        onPointerDown={(e) => handleColumnPointerDown(e, dayIdx, MIN_PX)}
        onPointerMove={(e) => handleColumnPointerMove(e, dayIdx, MIN_PX)}
        onPointerUp={handleColumnPointerUp}
        onPointerCancel={handleColumnPointerCancel}
      >
        {/* Hour lines */}
        {hourLabels.map(({ top }, i) => (
          <div key={i} className="absolute left-0 right-0 pointer-events-none"
            style={{ top, borderTop: '1px solid var(--border-subtle)', opacity: 0.5 }} />
        ))}
        {hourLabels.map(({ top }, i) => (
          <div key={`h-${i}`} className="absolute left-0 right-0 pointer-events-none"
            style={{ top: top + toPx(30), borderTop: '1px dashed var(--border-subtle)', opacity: 0.25 }} />
        ))}

        {/* Closed areas */}
        {closedTop > 0 && (
          <div className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{ height: closedTop, background: 'rgba(0,0,0,0.25)', zIndex: 1 }} />
        )}
        {closedBottom > 0 && (
          <div className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{ height: closedBottom, background: 'rgba(0,0,0,0.25)', zIndex: 1 }} />
        )}

        {/* Drop target highlight */}
        {dropHere && (
          <div className="absolute left-1 right-1 pointer-events-none rounded-lg z-10"
            style={{
              top:    toPx(dropHere.timeMin - GRID_START),
              height: Math.max(toPx(dropHere.duracao), 24),
              background: dropHere.valid ? 'rgba(16, 185, 129,0.15)' : 'rgba(239, 68, 68,0.15)',
              border: `2px dashed ${dropHere.valid ? '#10B981' : '#EF4444'}`,
            }} />
        )}

        {/* Hover indicator (no drag active) — shows a 30-min preview block so
            the user can clearly see which :00/:30 slot they'll snap to. */}
        {isHovered && !activeBlock && (
          <>
            <div className="absolute left-1 right-1 pointer-events-none z-10 rounded-md"
              style={{
                top:    hoverPos!.y,
                height: toPx(30),
                background: 'rgba(16, 185, 129,0.16)',
                border: '1.5px dashed var(--green-primary)',
              }} />
            <div className="absolute pointer-events-none z-20"
              style={{ top: hoverPos!.y - 9, left: 4 }}>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums"
                style={{ background: 'var(--green-primary)', color: '#000', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                {minToTime(hoverPos!.timeMin)}
              </span>
            </div>
          </>
        )}

        {/* Current time line */}
        {isToday && nowMin >= GRID_START && nowMin <= GRID_END && (
          <div className="absolute left-0 right-0 pointer-events-none"
            style={{ top: toPx(nowMin - GRID_START), zIndex: 20 }}>
            {/* Horizontal line */}
            <div style={{ position: 'absolute', left: 0, right: 0, borderTop: '2px solid var(--green-primary)' }} />
            {/* Time badge */}
            <span style={{
              position: 'absolute', left: 3, top: -9,
              background: 'var(--green-primary)', color: '#000',
              fontSize: 8, fontWeight: 700, lineHeight: 1,
              padding: '2px 4px', borderRadius: 4, whiteSpace: 'nowrap',
            }}>
              {minToTime(nowMin)}
            </span>
          </div>
        )}

        {/* Blocks */}
        {allBlocks.map((b) => {
          const pos    = layout[b.id]
          const top    = toPx(b.startMin - GRID_START)
          const height = Math.max(toPx(b.endMin - b.startMin), 24)
          const left   = pos.left + 0.5
          const width  = pos.width - 1

          if (b.isAluno && b.aluno) {
            const a       = b.aluno
            // Override color if there's a falta record for this aluno on this date
            const faltaRec = faltas.find(f => f.aluno_id === a.id && f.data_falta === dateStr && f.status !== 'reposta')
            const color = faltaRec
              ? (faltaRec.tipo === 'cancelamento' ? CANCELAMENTO_COLOR : faltaRec.culpa === 'professor' ? PROFESSOR_COLOR : FALTA_COLOR)
              : TIPO_COLOR.aula
            const blockId = b.id
            const dragData: DragData = {
              blockType: 'aluno', aluno: a,
              dayIdx, startMin: b.startMin, duracao: b.endMin - b.startMin,
            }
            return (
              <DraggableBlock key={b.id}
                isSource={activeBlock?.id === blockId && isDraggingRef.current}
                onPointerDown={(e) => handleBlockPointerDown(e, blockId, dragData)}
                style={{ position: 'absolute', top, height, left: `${left}%`, width: `${width}%`, zIndex: 2 }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isDraggingRef.current) { isDraggingRef.current = false; return }
                  setModal({ type: 'aluno-card', aluno: a, dayIdx, date: day })
                }}>
                <div className="w-full h-full rounded-lg overflow-hidden"
                  style={{ background: color + '20', borderLeft: `3px solid ${color}`, padding: '3px 5px', cursor: 'grab' }}>
                  <p className="text-[11px] font-bold leading-tight truncate" style={{ color }}>{a.nome.split(' ')[0]}</p>
                  {height > 26 && <p className="text-[10px] truncate" style={{ color: color + 'bb' }}>{a.horarios.find(x => x.dia === dayKey)?.horario ?? ''} · {a.local}</p>}
                </div>
              </DraggableBlock>
            )
          }

          if (!b.isAluno && b.evento) {
            const ev        = b.evento
            const color     = ev.tipo === 'aula_extra' ? TIPO_COLOR.aula_extra : (ev.cor ?? TIPO_COLOR[ev.tipo])
            const alunoNome = alunos.find(a => a.id === ev.aluno_id)?.nome
            const blockId   = b.id
            const isExtra   = ev.tipo === 'aula_extra'
            const dragData: DragData = {
              blockType: 'evento', evento: ev,
              dayIdx, startMin: b.startMin, duracao: b.endMin - b.startMin,
            }
            return (
              <DraggableBlock key={b.id}
                isSource={activeBlock?.id === blockId && isDraggingRef.current}
                onPointerDown={(e) => handleBlockPointerDown(e, blockId, dragData)}
                style={{ position: 'absolute', top, height, left: `${left}%`, width: `${width}%`, zIndex: 2 }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isDraggingRef.current) { isDraggingRef.current = false; return }
                  setModal({ type: 'evento-card', evento: ev, alunoNome })
                }}>
                <div className="w-full h-full rounded-lg overflow-hidden"
                  style={{ background: color + '20', borderLeft: `3px solid ${color}`, padding: '3px 5px', cursor: 'grab' }}>
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] font-bold leading-tight truncate flex-1" style={{ color }}>{ev.titulo}</p>
                    {isExtra && (
                      <span className="text-[9px] font-bold px-1 rounded shrink-0" style={{ background: color, color: '#000', lineHeight: '14px' }}>Extra</span>
                    )}
                  </div>
                  {height > 26 && alunoNome && <p className="text-[10px] truncate" style={{ color: color + 'bb' }}>{alunoNome.split(' ')[0]}</p>}
                </div>
              </DraggableBlock>
            )
          }
          return null
        })}
      </DroppableDay>
    )
  }

  // ── drag overlay ghost ─────────────────────────────────────────────────────

  function renderDragOverlay() {
    if (!activeBlock) return null
    const color  = activeBlock.blockType === 'aluno' ? TIPO_COLOR.aula : (activeBlock.evento?.cor ?? TIPO_COLOR[activeBlock.evento?.tipo ?? 'outro'])
    const height = isMobileWeekDragRef.current
      ? Math.max(activeBlock.duracao * COMPACT_MIN_PX, 16)
      : Math.max(toPx(activeBlock.duracao), 24)
    const label  = activeBlock.blockType === 'aluno' ? activeBlock.aluno!.nome.split(' ')[0] : activeBlock.evento!.titulo
    const sub    = activeBlock.blockType === 'aluno' ? activeBlock.aluno!.local : TIPO_LABEL[activeBlock.evento!.tipo]
    return (
      <div style={{
        width: 150, height,
        background: color + '30',
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: '3px 7px',
        boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 2px ${color}44`,
        opacity: 0.92,
        pointerEvents: 'none',
      }}>
        <p style={{ color, fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{label}</p>
        {height > 32 && <p style={{ color: color + 'cc', fontSize: 10, marginTop: 2 }}>{minToTime(activeBlock.startMin)} · {sub}</p>}
      </div>
    )
  }

  // ── Mobile week view ──────────────────────────────────────────────────────

  function renderMobileWeekView() {
    const cToPx = (min: number) => min * COMPACT_MIN_PX

    function handleCompactClick(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
      if ((e.target as HTMLElement).closest('[data-block]')) return
      const rect    = e.currentTarget.getBoundingClientRect()
      const snapped = snapTimeFromEvent(e.clientY, rect.top, COMPACT_MIN_PX)
      const cfg     = DAY_CFG[WEEK_KEYS[dayIdx]]
      if (snapped < cfg.start || snapped >= cfg.end) return
      setHoverPos(null)
      setModal({ type: 'add', dayIdx, date: weekDays[dayIdx], timeMin: snapped })
    }

    const cHourLabels = Array.from({ length: 17 }, (_, i) => ({
      label: `${i + 6}`,
      top: cToPx((i + 6) * 60 - GRID_START),
    }))

    return (
      <div style={{ minWidth: 576 }}>

        {/* Sticky day headers */}
        <div className="flex sticky top-0 z-10 shrink-0"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 32, flexShrink: 0 }} />
          {weekDays.map((day, i) => {
            const isTodayDay = toDateStr(day) === todayStr
            return (
              <div key={i} className="flex-1 flex flex-col items-center py-1.5 border-l"
                style={{ borderColor: 'var(--border-subtle)', minWidth: 78, textAlign: 'center' }}>
                <span className="text-[10px] font-medium"
                  style={{ color: isTodayDay ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                  {WEEK_LABELS[i]}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700, lineHeight: 1,
                  color: isTodayDay ? '#000' : 'var(--text-primary)',
                  background: isTodayDay ? 'var(--green-primary)' : 'transparent',
                  borderRadius: '50%', width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '2px auto 0',
                }}>
                  {day.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Grid body */}
        <div className="flex" style={{ height: COMPACT_GRID_H }}>

          {/* Hour labels */}
          <div className="relative shrink-0" style={{ width: 32, height: COMPACT_GRID_H }}>
            {cHourLabels.map(({ label, top }) => (
              <div key={label} className="absolute right-1 -translate-y-2"
                style={{ top, fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((_, dayIdx) => {
            const dayKey  = WEEK_KEYS[dayIdx]
            const cfg     = DAY_CFG[dayKey]
            const dateStr = toDateStr(weekDays[dayIdx])
            const day     = weekDays[dayIdx]

            type BlockItem = {
              id: string; startMin: number; endMin: number
              isAluno: boolean; aluno?: AlunoAgenda; evento?: EventoAgendaRow
            }
            const allBlocks: BlockItem[] = []

            for (const a of alunos) {
              const h = a.horarios.find(x => x.dia === dayKey)
              if (!h) continue
              const startMin    = timeToMin(h.horario)
              const isCancelled = eventos.some(ev =>
                ev.tipo === 'bloqueado' && ev.data_especifica === dateStr &&
                timeToMin(ev.horario_inicio) === startMin
              )
              if (isCancelled) continue
              allBlocks.push({ id: `a-${a.id}`, startMin, endMin: startMin + a.duracao, isAluno: true, aluno: a })
            }
            for (const ev of eventos) {
              if (ev.dia_semana !== dayKey && ev.data_especifica !== dateStr) continue
              const startMin = timeToMin(ev.horario_inicio)
              allBlocks.push({ id: `e-${ev.id}`, startMin, endMin: startMin + ev.duracao, isAluno: false, evento: ev })
            }

            const layout       = computeLayout(allBlocks)
            const closedTop    = cToPx(cfg.start - GRID_START)
            const closedBottom = cToPx(GRID_END - cfg.end)
            const isToday      = toDateStr(weekDays[dayIdx]) === todayStr

            const isHoveredCompact = hoverPos?.dayIdx === dayIdx

            return (
              <div key={dayIdx}
                ref={(el) => { compactColRefs.current[dayIdx] = el }}
                className="relative flex-1 border-l cursor-crosshair"
                style={{ height: COMPACT_GRID_H, borderColor: 'var(--border-subtle)', minWidth: 78, touchAction: 'pan-y' }}
                onClick={(e) => handleCompactClick(e, dayIdx)}
                onPointerDown={(e) => handleColumnPointerDown(e, dayIdx, COMPACT_MIN_PX)}
                onPointerMove={(e) => handleColumnPointerMove(e, dayIdx, COMPACT_MIN_PX)}
                onPointerUp={handleColumnPointerUp}
                onPointerCancel={handleColumnPointerCancel}>

                {/* Hour lines */}
                {cHourLabels.map(({ top }, i) => (
                  <div key={i} className="absolute left-0 right-0 pointer-events-none"
                    style={{ top, borderTop: '1px solid var(--border-subtle)', opacity: 0.4 }} />
                ))}
                {cHourLabels.map(({ top }, i) => (
                  <div key={`h-${i}`} className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: top + cToPx(30), borderTop: '1px dashed var(--border-subtle)', opacity: 0.18 }} />
                ))}

                {/* Press-to-preview indicator (compact / mobile) */}
                {isHoveredCompact && !activeBlock && (
                  <>
                    <div className="absolute left-px right-px pointer-events-none rounded z-10"
                      style={{
                        top:    hoverPos!.y,
                        height: cToPx(30),
                        background: 'rgba(16, 185, 129,0.2)',
                        border: '1.5px dashed var(--green-primary)',
                      }} />
                    <div className="absolute pointer-events-none z-20"
                      style={{ top: hoverPos!.y - 10, left: 2 }}>
                      <span className="text-[9px] font-black px-1 py-0.5 rounded tabular-nums"
                        style={{ background: 'var(--green-primary)', color: '#000', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                        {minToTime(hoverPos!.timeMin)}
                      </span>
                    </div>
                  </>
                )}

                {/* Today tint */}
                {isToday && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'rgba(16, 185, 129,0.03)', zIndex: 0 }} />
                )}

                {/* Current time line (compact) */}
                {isToday && nowMin >= GRID_START && nowMin <= GRID_END && (
                  <div className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: cToPx(nowMin - GRID_START), zIndex: 15 }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, borderTop: '1.5px solid var(--green-primary)' }} />
                    <div style={{
                      position: 'absolute', left: 0, top: -3,
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--green-primary)',
                    }} />
                  </div>
                )}

                {/* Closed areas */}
                {closedTop > 0 && (
                  <div className="absolute left-0 right-0 top-0 pointer-events-none"
                    style={{ height: closedTop, background: 'rgba(0,0,0,0.22)', zIndex: 1 }} />
                )}
                {closedBottom > 0 && (
                  <div className="absolute left-0 right-0 bottom-0 pointer-events-none"
                    style={{ height: closedBottom, background: 'rgba(0,0,0,0.22)', zIndex: 1 }} />
                )}

                {/* Drop target highlight (compact week drag) */}
                {dropTarget?.dayIdx === dayIdx && (
                  <div className="absolute left-px right-px pointer-events-none rounded z-10"
                    style={{
                      top:    cToPx(dropTarget.timeMin - GRID_START),
                      height: Math.max(cToPx(dropTarget.duracao), 12),
                      background: dropTarget.valid ? 'rgba(16, 185, 129,0.15)' : 'rgba(239, 68, 68,0.15)',
                      border: `1.5px dashed ${dropTarget.valid ? '#10B981' : '#EF4444'}`,
                    }} />
                )}

                {/* Blocks */}
                {allBlocks.map((b) => {
                  const pos    = layout[b.id]
                  const top    = cToPx(b.startMin - GRID_START)
                  const height = Math.max(cToPx(b.endMin - b.startMin), 16)
                  const left   = pos.left + 0.5
                  const width  = pos.width - 1

                  if (b.isAluno && b.aluno) {
                    const a        = b.aluno
                    const faltaRec2 = faltas.find(f => f.aluno_id === a.id && f.data_falta === dateStr && f.status !== 'reposta')
                    const color    = faltaRec2
                      ? (faltaRec2.tipo === 'cancelamento' ? CANCELAMENTO_COLOR : faltaRec2.culpa === 'professor' ? PROFESSOR_COLOR : FALTA_COLOR)
                      : TIPO_COLOR.aula
                    const dragData: DragData = {
                      blockType: 'aluno', aluno: a,
                      dayIdx, startMin: b.startMin, duracao: b.endMin - b.startMin,
                    }
                    return (
                      <div key={b.id} data-block="true"
                        style={{
                          position: 'absolute', top, height, left: `${left}%`, width: `${width}%`, zIndex: 2,
                          touchAction: 'none', userSelect: 'none',
                          opacity: activeBlock?.id === b.id && isDraggingRef.current ? 0 : 1,
                        }}
                        onPointerDown={(e) => handleBlockPointerDown(e, b.id, dragData, true)}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isDraggingRef.current) return
                          setModal({ type: 'aluno-card', aluno: a, dayIdx, date: day })
                        }}>
                        <div className="w-full h-full rounded overflow-hidden"
                          style={{ background: color + '20', borderLeft: `2px solid ${color}`, padding: '1px 3px', cursor: 'grab' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.2, color, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {a.nome.split(' ')[0]}
                          </p>
                          {height > 22 && (
                            <p style={{ fontSize: 8, color: color + 'aa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {a.horarios.find(x => x.dia === dayKey)?.horario ?? ''}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  }

                  if (!b.isAluno && b.evento) {
                    const ev        = b.evento
                    const color     = ev.tipo === 'aula_extra' ? TIPO_COLOR.aula_extra : (ev.cor ?? TIPO_COLOR[ev.tipo])
                    const alunoNome = alunos.find(a => a.id === ev.aluno_id)?.nome
                    const dragData: DragData = {
                      blockType: 'evento', evento: ev,
                      dayIdx, startMin: b.startMin, duracao: b.endMin - b.startMin,
                    }
                    return (
                      <div key={b.id} data-block="true"
                        style={{
                          position: 'absolute', top, height, left: `${left}%`, width: `${width}%`, zIndex: 2,
                          touchAction: 'none', userSelect: 'none',
                          opacity: activeBlock?.id === b.id && isDraggingRef.current ? 0 : 1,
                        }}
                        onPointerDown={(e) => handleBlockPointerDown(e, b.id, dragData, true)}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isDraggingRef.current) return
                          setModal({ type: 'evento-card', evento: ev, alunoNome })
                        }}>
                        <div className="w-full h-full rounded overflow-hidden"
                          style={{ background: color + '20', borderLeft: `2px solid ${color}`, padding: '1px 3px', cursor: 'grab' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.2, color, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {ev.aluno_id && alunoNome ? alunoNome.split(' ')[0] : ev.titulo}
                          </p>
                          {height > 22 && (
                            <p style={{ fontSize: 8, color: color + 'aa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {ev.horario_inicio}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const weekLabel = `${formatDay(weekDays[0])} – ${formatDay(weekDays[6])}`

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Agenda</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Semana {weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModal({ type: 'slots' })}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Ver disponíveis
            </button>
            {[
              { label: '‹', delta: -1 },
              { label: 'Hoje', delta: -weekOffset },
              { label: '›', delta: 1 },
            ].map(({ label, delta }) => (
              <button key={label} onClick={() => setWeekOffset(w => w + delta)}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Color legend */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-2 shrink-0 overflow-x-auto"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          {([
            { color: TIPO_COLOR.aula,       label: 'Aula' },
            { color: FALTA_COLOR,           label: 'Aluno faltou' },
            { color: CANCELAMENTO_COLOR,    label: 'Cancelamento antecipado' },
            { color: PROFESSOR_COLOR,       label: 'Professor cancelou' },
            { color: TIPO_COLOR.reposicao,  label: 'Reposição' },
            { color: TIPO_COLOR.aula_extra, label: 'Aula Extra' },
          ] as const).map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Mobile view toggle (Dia / Semana) */}
        <div className="md:hidden flex items-center gap-1 px-3 py-2 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          {(['dia', 'semana'] as const).map(v => (
            <button key={v} onClick={() => changeMobileView(v)}
              className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              style={mobileView === v
                ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.3)' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }
              }>
              {v === 'dia' ? 'Dia' : 'Semana'}
            </button>
          ))}
        </div>

        {/* Mobile day tabs — only in Dia mode */}
        {mobileView === 'dia' && (
          <div className="md:hidden flex overflow-x-auto shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {weekDays.map((day, i) => {
              const isTodayDay = toDateStr(day) === todayStr
              const isActive   = mobileDayIdx === i
              return (
                <button key={i} onClick={() => setMobileDayIdx(i)}
                  className="flex-shrink-0 flex flex-col items-center px-4 py-2.5 text-xs font-semibold cursor-pointer"
                  style={{ color: isActive ? 'var(--green-primary)' : 'var(--text-secondary)', borderBottom: isActive ? '2px solid var(--green-primary)' : '2px solid transparent', background: 'transparent' }}>
                  <span>{WEEK_LABELS[i]}</span>
                  <span className="mt-0.5" style={{
                    background: isTodayDay ? 'var(--green-primary)' : 'transparent',
                    color: isTodayDay ? '#000' : 'inherit',
                    borderRadius: '50%', width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: isTodayDay ? 700 : 500,
                  }}>{day.getDate()}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-hidden relative">
          {loadingWeek && (
            <div className="absolute inset-0 flex items-center justify-center z-20"
              style={{ background: 'rgba(0,0,0,0.3)' }}>
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--green-primary)" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          <div ref={scrollContainerRef} className="overflow-auto h-full" style={{ WebkitOverflowScrolling: 'touch' }}>

            {/* Desktop */}
            <div className="hidden md:flex flex-col" style={{ minWidth: 900 }}>
              <div className="flex sticky top-0 z-10 shrink-0"
                style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="shrink-0" style={{ width: 52 }} />
                {weekDays.map((day, i) => {
                  const isTodayDay = toDateStr(day) === todayStr
                  const key        = WEEK_KEYS[i]
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center py-2 border-l text-center"
                      style={{ borderColor: 'var(--border-subtle)', minWidth: 120 }}>
                      <span className="text-xs font-medium"
                        style={{ color: isTodayDay ? 'var(--green-primary)' : 'var(--text-muted)' }}>{WEEK_LABELS[i]}</span>
                      <span className="text-lg font-bold mt-0.5"
                        style={{ color: isTodayDay ? 'var(--green-primary)' : 'var(--text-primary)' }}>{day.getDate()}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {String(day.getMonth()+1).padStart(2,'0')}/{day.getFullYear()}
                      </span>
                      <span className="text-[10px] mt-0.5 px-1.5 py-px rounded"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                        {minToTime(DAY_CFG[key].start)}–{minToTime(DAY_CFG[key].end)}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex" style={{ height: gridHeight }}>
                <div className="relative shrink-0" style={{ width: 52, height: gridHeight }}>
                  {hourLabels.map(({ label, top }) => (
                    <div key={label} className="absolute right-2 text-[10px] -translate-y-2"
                      style={{ top, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</div>
                  ))}
                </div>
                {weekDays.map((_, i) => renderDayColumn(i))}
              </div>
            </div>

            {/* Mobile — Dia view */}
            {mobileView === 'dia' && (
              <div className="md:hidden flex" style={{ height: gridHeight }}>
                <div className="relative shrink-0" style={{ width: 44, height: gridHeight }}>
                  {hourLabels.map(({ label, top }) => (
                    <div key={label} className="absolute right-1.5 text-[10px] -translate-y-2"
                      style={{ top, color: 'var(--text-muted)' }}>{label}</div>
                  ))}
                </div>
                {renderDayColumn(mobileDayIdx)}
              </div>
            )}

            {/* Mobile — Semana view */}
            {mobileView === 'semana' && (
              <div className="md:hidden">
                {renderMobileWeekView()}
              </div>
            )}
          </div>

          {/* Mobile scroll helper bar — right side, overlays the grid */}
          <div className="md:hidden absolute right-0 top-0 bottom-0 z-30 flex flex-col items-center justify-between py-3 pointer-events-auto"
            style={{ width: 26, background: 'rgba(12,12,18,0.72)', backdropFilter: 'blur(6px)' }}>
            {[6,8,10,12,14,16,18,20,22].map(h => {
              const nowHour   = new Date().getHours()
              const isCurrent = nowHour >= h && nowHour < h + 2
              return (
                <button key={h}
                  onClick={() => scrollToHour(h)}
                  style={{
                    fontSize: 9, fontWeight: 700, lineHeight: 1,
                    color: isCurrent ? 'var(--green-primary)' : 'rgba(255,255,255,0.45)',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0',
                    textShadow: isCurrent ? '0 0 8px #10B981' : 'none',
                  }}>
                  {h}
                </button>
              )
            })}
          </div>

          {/* Agora floating button (mobile only) */}
          <button className="md:hidden absolute z-30 cursor-pointer"
            style={{
              right: 34, bottom: 12, fontSize: 10, fontWeight: 700, lineHeight: 1,
              background: 'var(--green-primary)', color: '#000',
              border: 'none', borderRadius: 10, padding: '5px 8px',
              boxShadow: '0 2px 10px rgba(16, 185, 129,0.4)',
            }}
            onClick={scrollToNow}>
            Agora
          </button>
        </div>

        {/* Mobile available btn */}
        <div className="md:hidden p-3 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={() => setModal({ type: 'slots' })}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
            Ver horários disponíveis
          </button>
        </div>

        {/* Custom drag overlay — fixed-positioned, follows pointer pixel-perfectly */}
        {activeBlock && overlayXY && (
          <div
            style={{
              position: 'fixed',
              left: overlayXY.x,
              top: overlayXY.y,
              zIndex: 9999,
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          >
            {renderDragOverlay()}
          </div>
        )}

        {/* Modals */}
        {modal?.type === 'add' && (
          <AddEventModal dayIdx={modal.dayIdx} date={modal.date} timeMin={modal.timeMin}
            alunos={alunos} onClose={() => setModal(null)}
            onSaved={(ev) => { addEvento(ev); setModal(null) }} />
        )}
        {modal?.type === 'aluno-card' && (
          <AlunoCardModal aluno={modal.aluno} dayIdx={modal.dayIdx} date={modal.date}
            eventos={eventos}
            prazoFaltaDias={prazoFaltaDias}
            faltasData={faltas}
            onClose={() => setModal(null)}
            onReagendar={() => setModal({ type: 'add', dayIdx: modal.dayIdx, date: modal.date, timeMin: timeToMin(modal.aluno.horarios.find(x => x.dia === WEEK_KEYS[modal.dayIdx])?.horario ?? '08:00') })}
            onFaltaRegistrada={(f) => setFaltas(prev => [...prev.filter(x => !(x.aluno_id === f.aluno_id && x.data_falta === f.data_falta)), f])}
            onGoToFaltas={() => { setModal(null); onGoToFaltas() }}
          />
        )}
        {modal?.type === 'evento-card' && (
          <EventoCardModal evento={modal.evento} alunoNome={modal.alunoNome}
            onClose={() => setModal(null)} onDeleted={removeEvento}
            onDeletedSerie={(ids) => setEventos(p => p.filter(e => !ids.includes(e.id)))}
            onEditar={() => setModal({ type: 'edit', evento: modal.evento })} />
        )}
        {modal?.type === 'edit' && (
          <EditEventoModal evento={modal.evento} onClose={() => setModal(null)} onSaved={updateEvento} />
        )}
        {modal?.type === 'slots' && (
          <AvailableSlotsModal weekDays={weekDays} alunos={alunos} eventos={eventos}
            onClose={() => setModal(null)}
            onSlotClick={(di, dt, tm) => setModal({ type: 'add', dayIdx: di, date: dt, timeMin: tm })} />
        )}
        {modal?.type === 'move-confirm' && (
          <MoveConfirmModal
            confirm={modal.confirm}
            saving={moveSaving}
            onClose={() => { if (!moveSaving) setModal(null) }}
            onThisWeek={() => handleMoveAlunoThisWeek(modal.confirm)}
            onPermanent={() =>
              modal.confirm.blockType === 'evento'
                ? handleMoveEvento(modal.confirm)
                : handleMoveAlunoPermanent(modal.confirm)
            }
          />
        )}
    </div>
  )
}
