'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createEventoAction,
  updateEventoAction,
  deleteEventoAction,
  updateAlunoScheduleAction,
  type EventoTipo,
  type EventoAgendaRow,
} from './actions'

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
  aula:       '#00E676',
  reposicao:  '#40C4FF',
  reuniao:    '#FFAB00',
  bloqueado:  '#FF5252',
  refeicao:   '#9E9E9E',
  outro:      '#CE93D8',
  aula_extra: '#69F0AE',
}
const TIPO_LABEL: Record<EventoTipo, string> = {
  aula:       'Aula',
  reposicao:  'Reposição',
  reuniao:    'Reunião',
  bloqueado:  'Bloqueado',
  refeicao:   'Refeição',
  outro:      'Outro',
  aula_extra: 'Aula Extra',
}
const OUTRO_CORES = ['#FFAB00','#CE93D8','#FF5252','#40C4FF','#9E9E9E']

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
}: {
  colRef?: (el: HTMLDivElement | null) => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave?: () => void
}) {
  return (
    <div
      ref={colRef}
      style={style}
      className={className}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
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
                  style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>{toLabel}</span>
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

  const dateStr  = toDateStr(date)
  const timeStr  = minToTime(timeMin)
  const dayLabel = `${WEEK_LABELS[dayIdx]} ${formatDay(date)}`
  const DURACAO_OPTS = [30, 45, 60, 90, 120]

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
      if (!titulo.trim()) { setErr('Informe um título.'); setSaving(false); return }
      payload = { tipo, titulo: titulo.trim(), data_especifica: dateStr, horario_inicio: timeStr, duracao, cor, observacao: obs.trim() || null }
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
                      style={{ background: alunoId === a.id ? 'var(--green-muted)' : 'var(--bg-card)', border: `1px solid ${alunoId === a.id ? 'rgba(0,230,118,0.2)' : 'var(--border-subtle)'}` }}>
                      <input type="radio" name="aluno" value={a.id} checked={alunoId === a.id}
                        onChange={() => { setAlunoId(a.id); setDuracao(a.duracao) }} className="accent-[#00E676]" />
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

        {step === 'outro' && (
          <>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Título</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Reunião, Almoço..."
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
            <div className="flex gap-1.5">
              {DURACAO_OPTS.map(d => (
                <button key={d} onClick={() => setDuracao(d)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: duracao === d ? 'var(--green-primary)' : 'var(--bg-card)', color: duracao === d ? '#000' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {d < 60 ? `${d}m` : d === 60 ? '1h' : d === 90 ? '1h30' : '2h'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Observação (opcional)</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
            </div>
          </>
        )}

        {err && <p className="text-xs text-center" style={{ color: '#FF5252' }}>{err}</p>}

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

function AlunoCardModal({
  aluno, dayIdx, date, eventos, onClose, onReagendar, onCancelado, onSaved,
}: {
  aluno: AlunoAgenda; dayIdx: number; date: Date
  eventos: EventoAgendaRow[]; onClose: () => void
  onReagendar: () => void
  onCancelado: (ev: EventoAgendaRow) => void
  onSaved: (ev: EventoAgendaRow) => void
}) {
  const [saving,  setSaving]  = useState(false)
  const [obsMode, setObsMode] = useState(false)
  const [obs,     setObs]     = useState(aluno.observacoes ?? '')
  const supabase = createClient()

  const dateStr = toDateStr(date)
  const dayKey = WEEK_KEYS[dayIdx]
  const alunoHorario = aluno.horarios.find(x => x.dia === dayKey)?.horario ?? '08:00'
  const isCancelled = eventos.some(e =>
    e.tipo === 'bloqueado' && e.data_especifica === dateStr &&
    timeToMin(e.horario_inicio) === timeToMin(alunoHorario)
  )

  async function handleCancelar() {
    setSaving(true)
    const res = await createEventoAction({
      tipo: 'bloqueado', titulo: `Aula cancelada — ${aluno.nome.split(' ')[0]}`,
      aluno_id: aluno.id, data_especifica: dateStr, horario_inicio: alunoHorario, duracao: aluno.duracao,
    })
    setSaving(false)
    if (res.data) { onCancelado(res.data); onClose() }
  }

  async function handleFalta() {
    setSaving(true)
    const res = await createEventoAction({
      tipo: 'outro', titulo: `Falta — ${aluno.nome.split(' ')[0]}`,
      aluno_id: aluno.id, data_especifica: dateStr, horario_inicio: alunoHorario, duracao: 15, cor: '#FF5252',
    })
    setSaving(false)
    if (res.data) { onSaved(res.data); onClose() }
  }

  async function handleSaveObs() {
    setSaving(true)
    await supabase.from('alunos').update({ observacoes: obs }).eq('id', aluno.id)
    setSaving(false); setObsMode(false)
  }

  const PLANO_LABEL: Record<string, string> = { por_aula: 'Por aula', mensalidade: 'Mensalidade' }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={aluno.nome} onClose={onClose} />
      <div className="p-5 flex flex-col gap-4">
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
        {!obsMode && aluno.observacoes && (
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Observações</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{aluno.observacoes}</p>
          </div>
        )}
        {obsMode && (
          <div className="flex flex-col gap-2">
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-focus)', color: 'var(--text-primary)' }} />
            <div className="flex gap-2">
              <button onClick={() => setObsMode(false)}
                className="px-3 py-2 rounded-lg text-xs cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                Cancelar
              </button>
              <button onClick={handleSaveObs} disabled={saving}
                className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--green-primary)', color: '#000' }}>
                {saving ? '...' : 'Salvar obs'}
              </button>
            </div>
          </div>
        )}
        {!obsMode && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '✗ Falta justificada', action: handleFalta,   color: '#FF5252',     bg: 'rgba(255,82,82,0.1)',   border: 'rgba(255,82,82,0.2)', disabled: saving || isCancelled },
              { label: '↺ Reagendar',          action: onReagendar,   color: '#40C4FF',     bg: 'rgba(64,196,255,0.1)', border: 'rgba(64,196,255,0.2)', disabled: false },
              { label: '📝 Observação',        action: ()=>setObsMode(true), color: 'var(--text-secondary)', bg: 'var(--bg-card)', border: 'var(--border-subtle)', disabled: false },
              { label: isCancelled ? 'Já cancelada' : '⊘ Cancelar aula', action: handleCancelar, color: '#FF5252', bg: 'rgba(255,82,82,0.1)', border: 'rgba(255,82,82,0.2)', disabled: saving || isCancelled },
            ].map(({ label, action, color, bg, border, disabled }) => (
              <button key={label} onClick={action} disabled={disabled}
                className="py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
                style={{ background: bg, color, border: `1px solid ${border}` }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  )
}

// ─── EventoCardModal ───────────────────────────────────────────────────────────

function EventoCardModal({
  evento, alunoNome, onClose, onDeleted, onEditar,
}: {
  evento: EventoAgendaRow; alunoNome?: string
  onClose: () => void; onDeleted: (id: string) => void; onEditar: () => void
}) {
  const [saving, setSaving] = useState(false)
  const color = evento.cor ?? TIPO_COLOR[evento.tipo]

  async function handleDelete() {
    if (!confirm('Remover este evento?')) return
    setSaving(true)
    await deleteEventoAction(evento.id)
    setSaving(false); onDeleted(evento.id); onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div className="h-1.5 rounded-t-2xl" style={{ background: color }} />
      <ModalHeader title={evento.titulo} onClose={onClose} />
      <div className="p-5 flex flex-col gap-3">
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
          <button onClick={handleDelete} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: 'rgba(255,82,82,0.1)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.2)' }}>
            {saving ? '...' : '🗑 Remover'}
          </button>
        </div>
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
            {[...OUTRO_CORES, TIPO_COLOR.aula, TIPO_COLOR.reposicao].map(c => (
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
        {err && <p className="text-xs" style={{ color: '#FF5252' }}>{err}</p>}
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
                        style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>
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

export function AgendaSemanal({ alunos, eventosIniciais }: Props) {
  const [weekOffset, setWeekOffset]     = useState(0)
  const [eventos, setEventos]           = useState<EventoAgendaRow[]>(eventosIniciais)
  const [modal, setModal]               = useState<Modal>(null)
  const [mobileDayIdx, setMobileDayIdx] = useState(() => {
    const d = new Date().getDay(); return d === 0 ? 6 : d - 1
  })
  const [hoverPos, setHoverPos]         = useState<{ dayIdx: number; y: number; timeMin: number } | null>(null)
  const [loadingWeek, setLoadingWeek]   = useState(false)

  // ── DnD state ───────────────────────────────────────────────────────────────
  const [activeBlock, setActiveBlock]   = useState<ActiveBlock | null>(null)
  const [dropTarget, setDropTarget]     = useState<DropTarget | null>(null)
  const [moveSaving, setMoveSaving]     = useState(false)
  const [overlayXY, setOverlayXY]       = useState<{ x: number; y: number } | null>(null)

  // Manual DnD refs
  const grabOffsetRef   = useRef({ x: 0, y: 0 })
  const dragDataRef     = useRef<DragData | null>(null)
  const isDraggingRef   = useRef(false)   // true once pointer moves > threshold
  const pointerStartRef = useRef({ x: 0, y: 0 })
  // 7 column refs — one per week day (index matches WEEK_KEYS)
  const colRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null))

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
      const col = findColumn(e.clientX)
      if (!col) { setDropTarget(null); return }
      const yInCol  = (e.clientY - grabOffsetRef.current.y) - col.rect.top
      const rawMin  = GRID_START + yInCol / MIN_PX
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

      const col = findColumn(e.clientX)
      if (!col) return

      const yInCol   = (e.clientY - grabOffsetRef.current.y) - col.rect.top
      const rawMin   = GRID_START + yInCol / MIN_PX
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

  // ── DnD handlers ─────────────────────────────────────────────────────────────

  function handleBlockPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    blockId: string,
    data: DragData,
  ) {
    // Don't start drag if a modal is open
    if (modal) return
    const rect = e.currentTarget.getBoundingClientRect()
    grabOffsetRef.current   = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    isDraggingRef.current   = false
    dragDataRef.current     = data
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

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
    if ((e.target as HTMLElement).closest('[data-block]')) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const raw     = GRID_START + (e.clientY - rect.top) / MIN_PX
    const snapped = Math.round(raw / 30) * 30
    const cfg     = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) return
    setModal({ type: 'add', dayIdx, date: weekDays[dayIdx], timeMin: snapped })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
    if ((e.target as HTMLElement).closest('[data-block]') || activeBlock) { setHoverPos(null); return }
    const rect    = e.currentTarget.getBoundingClientRect()
    const raw     = GRID_START + (e.clientY - rect.top) / MIN_PX
    const snapped = Math.round(raw / 30) * 30
    const cfg     = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) { setHoverPos(null); return }
    setHoverPos({ dayIdx, y: toPx(snapped - GRID_START), timeMin: snapped })
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
        onMouseLeave={() => setHoverPos(null)}
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
              background: dropHere.valid ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)',
              border: `2px dashed ${dropHere.valid ? '#00E676' : '#FF5252'}`,
            }} />
        )}

        {/* Hover indicator (no drag active) */}
        {isHovered && !activeBlock && (
          <div className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ top: hoverPos!.y }}>
            <div style={{ borderTop: '1.5px dashed #00E676' }}>
              <span className="absolute right-1 text-[10px] font-semibold px-1 rounded-sm"
                style={{ top: -9, background: 'var(--green-primary)', color: '#000' }}>
                Disponível · {minToTime(hoverPos!.timeMin)}
              </span>
            </div>
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
            const color   = TIPO_COLOR.aula
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
    const height = Math.max(toPx(activeBlock.duracao), 24)
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
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>
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

        {/* Mobile day tabs */}
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
          <div className="overflow-auto h-full" style={{ WebkitOverflowScrolling: 'touch' }}>

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

            {/* Mobile */}
            <div className="md:hidden flex" style={{ height: gridHeight }}>
              <div className="relative shrink-0" style={{ width: 44, height: gridHeight }}>
                {hourLabels.map(({ label, top }) => (
                  <div key={label} className="absolute right-1.5 text-[10px] -translate-y-2"
                    style={{ top, color: 'var(--text-muted)' }}>{label}</div>
                ))}
              </div>
              {renderDayColumn(mobileDayIdx)}
            </div>
          </div>
        </div>

        {/* Mobile available btn */}
        <div className="md:hidden p-3 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={() => setModal({ type: 'slots' })}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>
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
            eventos={eventos} onClose={() => setModal(null)}
            onReagendar={() => setModal({ type: 'add', dayIdx: modal.dayIdx, date: modal.date, timeMin: timeToMin(modal.aluno.horarios.find(x => x.dia === WEEK_KEYS[modal.dayIdx])?.horario ?? '08:00') })}
            onCancelado={addEvento} onSaved={addEvento} />
        )}
        {modal?.type === 'evento-card' && (
          <EventoCardModal evento={modal.evento} alunoNome={modal.alunoNome}
            onClose={() => setModal(null)} onDeleted={removeEvento}
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
