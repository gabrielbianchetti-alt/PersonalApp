'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createEventoAction,
  updateEventoAction,
  deleteEventoAction,
  type EventoTipo,
  type EventoAgendaRow,
} from './actions'

// ─── constants ────────────────────────────────────────────────────────────────

const HOUR_PX     = 64                        // pixels per hour
const MIN_PX      = HOUR_PX / 60              // ~1.0667 px per minute
const GRID_START  = 5 * 60 + 30              // 330 min = 5:30
const GRID_END    = 22 * 60                  // 1320 min = 22:00
const GRID_TOTAL  = GRID_END - GRID_START    // 990 min

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
  aula:      '#00E676',
  reposicao: '#40C4FF',
  reuniao:   '#FFAB00',
  bloqueado: '#FF5252',
  refeicao:  '#9E9E9E',
  outro:     '#CE93D8',
}
const TIPO_LABEL: Record<EventoTipo, string> = {
  aula:      'Aula',
  reposicao: 'Reposição',
  reuniao:   'Reunião',
  bloqueado: 'Bloqueado',
  refeicao:  'Refeição',
  outro:     'Outro',
}
const OUTRO_CORES = ['#FFAB00','#CE93D8','#FF5252','#40C4FF','#9E9E9E']

// ─── types ────────────────────────────────────────────────────────────────────

interface AlunoAgenda {
  id: string
  nome: string
  dias_semana: string[]
  horario_inicio: string
  duracao: number
  local: string
  modelo_cobranca: string
  observacoes: string | null
}

type Modal =
  | { type: 'add'; dayIdx: number; date: Date; timeMin: number }
  | { type: 'aluno-card'; aluno: AlunoAgenda; dayIdx: number; date: Date }
  | { type: 'evento-card'; evento: EventoAgendaRow; alunoNome?: string }
  | { type: 'edit'; evento: EventoAgendaRow }
  | { type: 'slots' }
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
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
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

function formatDayHeader(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isToday(d: Date): boolean {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function computeLayout(blocks: { id: string; startMin: number; endMin: number }[]) {
  const result: Record<string, { left: number; width: number }> = {}
  blocks.forEach((b) => {
    const overlapping = blocks.filter(
      (o) => o.id !== b.id && o.startMin < b.endMin && o.endMin > b.startMin
    )
    const group = [...overlapping, b].sort((a, c) => a.id < c.id ? -1 : 1)
    const colIdx = group.findIndex((g) => g.id === b.id)
    const total  = group.length
    result[b.id] = { left: (colIdx / total) * 100, width: (1 / total) * 100 }
  })
  return result
}

function getFreeSlotsForDay(
  dayIdx: number,
  weekDays: Date[],
  alunos: AlunoAgenda[],
  eventos: EventoAgendaRow[]
): string[] {
  const dayKey  = WEEK_KEYS[dayIdx]
  const cfg     = DAY_CFG[dayKey]
  const dateStr = toDateStr(weekDays[dayIdx])

  const busy: [number, number][] = []
  for (const a of alunos) {
    if (a.dias_semana.includes(dayKey)) {
      const s = timeToMin(a.horario_inicio)
      busy.push([s, s + a.duracao])
    }
  }
  for (const e of eventos) {
    if (e.dia_semana === dayKey || e.data_especifica === dateStr) {
      const s = timeToMin(e.horario_inicio)
      busy.push([s, s + e.duracao])
    }
  }

  const free: string[] = []
  for (let t = cfg.start; t + 30 <= cfg.end; t += 30) {
    if (!busy.some(([s, e]) => s < t + 30 && e > t)) {
      free.push(minToTime(t))
    }
  }
  return free
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}
      >
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

// ─── AddEventModal ─────────────────────────────────────────────────────────────

function AddEventModal({
  dayIdx, date, timeMin, alunos, onClose, onSaved,
}: {
  dayIdx: number; date: Date; timeMin: number
  alunos: AlunoAgenda[]; onClose: () => void
  onSaved: (ev: EventoAgendaRow) => void
}) {
  const [step, setStep]       = useState<'choose' | 'aula' | 'reposicao' | 'outro'>('choose')
  const [alunoId, setAlunoId] = useState('')
  const [duracao, setDuracao] = useState(60)
  const [titulo, setTitulo]   = useState('')
  const [tipo, setTipo]       = useState<EventoTipo>('outro')
  const [cor, setCor]         = useState(OUTRO_CORES[0])
  const [obs, setObs]         = useState('')
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  const dateStr = toDateStr(date)
  const timeStr = minToTime(timeMin)
  const dayLabel = `${WEEK_LABELS[dayIdx]} ${formatDayHeader(date)}`

  async function save() {
    setSaving(true); setErr('')
    let payload: Parameters<typeof createEventoAction>[0]
    if (step === 'aula' || step === 'reposicao') {
      const aluno = alunos.find(a => a.id === alunoId)
      if (!aluno) { setErr('Selecione um aluno.'); setSaving(false); return }
      payload = {
        tipo: step === 'aula' ? 'aula' : 'reposicao',
        titulo: `${step === 'aula' ? 'Aula' : 'Reposição'} — ${aluno.nome.split(' ')[0]}`,
        aluno_id: aluno.id,
        data_especifica: dateStr,
        horario_inicio: timeStr,
        duracao,
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

  const DURACAO_OPTS = [30, 45, 60, 90, 120]

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Novo evento · ${dayLabel} · ${timeStr}`} onClose={onClose} />
      <div className="p-5 flex flex-col gap-4">
        {step === 'choose' && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'aula',      label: '📅 Marcar aula',  color: TIPO_COLOR.aula },
              { id: 'reposicao', label: '🔁 Reposição',    color: TIPO_COLOR.reposicao },
              { id: 'outro',     label: '➕ Outros',       color: TIPO_COLOR.outro },
            ].map(opt => (
              <button key={opt.id} onClick={() => setStep(opt.id as typeof step)}
                className="flex flex-col items-center gap-2 py-4 rounded-xl cursor-pointer transition-colors text-xs font-semibold"
                style={{ background: 'var(--bg-card)', border: `1px solid var(--border-subtle)`, color: opt.color }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = opt.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >{opt.label}</button>
            ))}
          </div>
        )}

        {(step === 'aula' || step === 'reposicao') && (
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
                        onChange={() => { setAlunoId(a.id); setDuracao(a.duracao) }}
                        className="accent-[#00E676]" />
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
                    {d < 60 ? `${d}m` : `${d/60}h`}{d === 90 ? '30' : ''}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 'outro' && (
          <>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Título</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Reunião, Almoço..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--border-focus)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tipo</label>
              <div className="grid grid-cols-3 gap-1.5">
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
            <div className="grid grid-cols-5 gap-1.5">
              {DURACAO_OPTS.map(d => (
                <button key={d} onClick={() => setDuracao(d)}
                  className="py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: duracao === d ? 'var(--green-primary)' : 'var(--bg-card)', color: duracao === d ? '#000' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {d < 60 ? `${d}m` : d === 60 ? '1h' : d === 90 ? '1h30' : '2h'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Observação (opcional)</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--border-focus)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)' }} />
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
              style={{ background: 'var(--green-primary)', color: '#000' }}>
              {saving ? 'Salvando...' : 'Salvar'}
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
  const [saving, setSaving] = useState(false)
  const [obsMode, setObsMode] = useState(false)
  const [obs, setObs] = useState(aluno.observacoes ?? '')
  const supabase = createClient()

  const dateStr = toDateStr(date)
  const isCancelled = eventos.some(e =>
    e.tipo === 'bloqueado' &&
    e.data_especifica === dateStr &&
    timeToMin(e.horario_inicio) === timeToMin(aluno.horario_inicio)
  )

  async function handleCancelar() {
    setSaving(true)
    const res = await createEventoAction({
      tipo: 'bloqueado',
      titulo: `Aula cancelada — ${aluno.nome.split(' ')[0]}`,
      aluno_id: aluno.id,
      data_especifica: dateStr,
      horario_inicio: aluno.horario_inicio,
      duracao: aluno.duracao,
    })
    setSaving(false)
    if (res.data) { onCancelado(res.data); onClose() }
  }

  async function handleFalta() {
    setSaving(true)
    const res = await createEventoAction({
      tipo: 'outro',
      titulo: `Falta — ${aluno.nome.split(' ')[0]}`,
      aluno_id: aluno.id,
      data_especifica: dateStr,
      horario_inicio: aluno.horario_inicio,
      duracao: 15,
      cor: '#FF5252',
    })
    setSaving(false)
    if (res.data) { onSaved(res.data); onClose() }
  }

  async function handleSaveObs() {
    setSaving(true)
    await supabase.from('alunos').update({ observacoes: obs }).eq('id', aluno.id)
    setSaving(false)
    setObsMode(false)
  }

  const PLANO_LABEL: Record<string, string> = { por_aula: 'Por aula', mensalidade: 'Mensalidade' }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={aluno.nome} onClose={onClose} />
      <div className="p-5 flex flex-col gap-4">
        {/* Info */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Horário', value: `${aluno.horario_inicio} (${aluno.duracao}min)` },
            { label: 'Local',   value: aluno.local || '—' },
            { label: 'Plano',   value: PLANO_LABEL[aluno.modelo_cobranca] ?? aluno.modelo_cobranca },
            { label: 'Data',    value: `${WEEK_LABELS[dayIdx]} ${formatDayHeader(date)}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Obs */}
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

        {/* Actions */}
        {!obsMode && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleFalta} disabled={saving || isCancelled}
              className="py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
              style={{ background: 'rgba(255,82,82,0.1)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.2)' }}>
              ✗ Falta justificada
            </button>
            <button onClick={onReagendar}
              className="py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'rgba(64,196,255,0.1)', color: '#40C4FF', border: '1px solid rgba(64,196,255,0.2)' }}>
              ↺ Reagendar
            </button>
            <button onClick={() => setObsMode(true)}
              className="py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              📝 Observação
            </button>
            <button onClick={handleCancelar} disabled={saving || isCancelled}
              className="py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
              style={{ background: 'rgba(255,82,82,0.1)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.2)' }}>
              {isCancelled ? 'Já cancelada' : '⊘ Cancelar aula'}
            </button>
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
    setSaving(false)
    onDeleted(evento.id)
    onClose()
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
            <div key={label} className="rounded-xl p-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
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
  evento: EventoAgendaRow; onClose: () => void
  onSaved: (ev: EventoAgendaRow) => void
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
    const res = await updateEventoAction(evento.id, {
      titulo: titulo.trim(), duracao, horario_inicio: hora, observacao: obs.trim() || null, cor,
    })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(res.data!)
    onClose()
  }

  const DURACAO_OPTS = [30, 45, 60, 90, 120]
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
              {DURACAO_OPTS.map(d => <option key={d} value={d}>{d < 60 ? `${d}min` : d === 60 ? '1h' : d === 90 ? '1h30' : '2h'}</option>)}
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
                {WEEK_LABELS[dayIdx]} {formatDayHeader(day)}
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
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1  // convert Sun=0…Sat=6 → Mon-index 0…6
  })
  const [hoverPos, setHoverPos]         = useState<{ dayIdx: number; y: number; timeMin: number } | null>(null)
  const [loadingWeek, setLoadingWeek]   = useState(false)
  const isFirstMount                    = useRef(true)

  const weekDays = getWeekDays(weekOffset)
  const todayStr = toDateStr(new Date())

  // Fetch eventos when week changes
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
      .then(({ data }) => {
        setEventos(data ?? [])
        setLoadingWeek(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  // ── handlers ────────────────────────────────────────────────────────────────

  function addEvento(ev: EventoAgendaRow) {
    setEventos(prev => [...prev, ev])
    setModal(null)
  }

  function updateEvento(ev: EventoAgendaRow) {
    setEventos(prev => prev.map(e => e.id === ev.id ? ev : e))
  }

  function removeEvento(id: string) {
    setEventos(prev => prev.filter(e => e.id !== id))
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
    if ((e.target as HTMLElement).closest('[data-block]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const raw = GRID_START + y / MIN_PX
    const snapped = Math.round(raw / 30) * 30
    const cfg = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) return
    setModal({ type: 'add', dayIdx, date: weekDays[dayIdx], timeMin: snapped })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
    if ((e.target as HTMLElement).closest('[data-block]')) { setHoverPos(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const raw = GRID_START + y / MIN_PX
    const snapped = Math.round(raw / 30) * 30
    const cfg = DAY_CFG[WEEK_KEYS[dayIdx]]
    if (snapped < cfg.start || snapped >= cfg.end) { setHoverPos(null); return }
    setHoverPos({ dayIdx, y: toPx(snapped - GRID_START), timeMin: snapped })
  }

  // ── grid rendering ─────────────────────────────────────────────────────────

  // Hour labels: 6:00 to 22:00
  const hourLabels = Array.from({ length: 17 }, (_, i) => {
    const h = i + 6
    return { label: `${h}:00`, top: toPx(h * 60 - GRID_START) }
  })

  const gridHeight = toPx(GRID_TOTAL)

  function renderDayColumn(dayIdx: number) {
    const dayKey  = WEEK_KEYS[dayIdx]
    const cfg     = DAY_CFG[dayKey]
    const dateStr = toDateStr(weekDays[dayIdx])
    const day     = weekDays[dayIdx]

    // Aluno blocks (only if not cancelled)
    type BlockItem = { id: string; startMin: number; endMin: number; isAluno: boolean; aluno?: AlunoAgenda; evento?: EventoAgendaRow }
    const allBlocks: BlockItem[] = []

    for (const a of alunos) {
      if (!a.dias_semana.includes(dayKey)) continue
      const startMin = timeToMin(a.horario_inicio)
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

    const layout = computeLayout(allBlocks)
    const closedTop    = toPx(cfg.start - GRID_START)
    const closedBottom = toPx(GRID_END - cfg.end)
    const isHovered    = hoverPos?.dayIdx === dayIdx

    return (
      <div
        key={dayIdx}
        className="relative flex-1 border-l cursor-crosshair min-w-0"
        style={{
          height: gridHeight,
          borderColor: 'var(--border-subtle)',
          minWidth: 120,
        }}
        onClick={(e) => handleColumnClick(e, dayIdx)}
        onMouseMove={(e) => handleMouseMove(e, dayIdx)}
        onMouseLeave={() => setHoverPos(null)}
      >
        {/* Hour lines */}
        {hourLabels.map(({ top }, i) => (
          <div key={i} className="absolute left-0 right-0 pointer-events-none"
            style={{ top, borderTop: '1px solid var(--border-subtle)', opacity: 0.5 }} />
        ))}

        {/* Half-hour lines */}
        {hourLabels.map(({ top }, i) => (
          <div key={`h-${i}`} className="absolute left-0 right-0 pointer-events-none"
            style={{ top: top + toPx(30), borderTop: '1px dashed var(--border-subtle)', opacity: 0.25 }} />
        ))}

        {/* Closed top area */}
        {closedTop > 0 && (
          <div className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{ height: closedTop, background: 'rgba(0,0,0,0.25)', zIndex: 1 }} />
        )}
        {/* Closed bottom area */}
        {closedBottom > 0 && (
          <div className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{ height: closedBottom, background: 'rgba(0,0,0,0.25)', zIndex: 1 }} />
        )}

        {/* Hover indicator */}
        {isHovered && (
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
          const pos   = layout[b.id]
          const top   = toPx(b.startMin - GRID_START)
          const height = Math.max(toPx(b.endMin - b.startMin), 24)
          const left  = pos.left + 0.5
          const width = pos.width - 1

          if (b.isAluno && b.aluno) {
            const a     = b.aluno
            const color = TIPO_COLOR.aula
            return (
              <div key={b.id} data-block="true"
                onClick={(e) => { e.stopPropagation(); setModal({ type: 'aluno-card', aluno: a, dayIdx, date: day }) }}
                className="absolute rounded-lg overflow-hidden cursor-pointer transition-opacity hover:opacity-90 select-none"
                style={{ top, height, left: `${left}%`, width: `${width}%`, background: color + '20', borderLeft: `3px solid ${color}`, padding: '3px 5px', zIndex: 2 }}>
                <p className="text-[11px] font-bold leading-tight truncate" style={{ color }}>
                  {a.nome.split(' ')[0]}
                </p>
                {height > 26 && (
                  <p className="text-[10px] truncate" style={{ color: color + 'bb' }}>
                    {a.horario_inicio} · {a.local}
                  </p>
                )}
              </div>
            )
          }

          if (!b.isAluno && b.evento) {
            const ev    = b.evento
            const color = ev.cor ?? TIPO_COLOR[ev.tipo]
            const alunoNome = alunos.find(a => a.id === ev.aluno_id)?.nome
            return (
              <div key={b.id} data-block="true"
                onClick={(e) => { e.stopPropagation(); setModal({ type: 'evento-card', evento: ev, alunoNome }) }}
                className="absolute rounded-lg overflow-hidden cursor-pointer transition-opacity hover:opacity-90 select-none"
                style={{ top, height, left: `${left}%`, width: `${width}%`, background: color + '20', borderLeft: `3px solid ${color}`, padding: '3px 5px', zIndex: 2 }}>
                <p className="text-[11px] font-bold leading-tight truncate" style={{ color }}>
                  {ev.titulo}
                </p>
                {height > 26 && alunoNome && (
                  <p className="text-[10px] truncate" style={{ color: color + 'bb' }}>
                    {alunoNome.split(' ')[0]}
                  </p>
                )}
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }

  // Week range label
  const weekLabel = `${formatDayHeader(weekDays[0])} – ${formatDayHeader(weekDays[6])}`

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
          {/* Available slots button */}
          <button onClick={() => setModal({ type: 'slots' })}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Ver disponíveis
          </button>
          {/* Week nav */}
          {[
            { label: '‹', delta: -1, title: 'Semana anterior' },
            { label: 'Hoje', delta: -weekOffset, title: 'Ir para hoje' },
            { label: '›', delta: 1,  title: 'Próxima semana' },
          ].map(({ label, delta, title }) => (
            <button key={label} title={title}
              onClick={() => setWeekOffset(w => w + delta)}
              className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: day tabs */}
      <div className="md:hidden flex overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {weekDays.map((day, i) => {
          const isTodayDay = toDateStr(day) === todayStr
          const isActive   = mobileDayIdx === i
          return (
            <button key={i} onClick={() => setMobileDayIdx(i)}
              className="flex-shrink-0 flex flex-col items-center px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors"
              style={{
                color: isActive ? 'var(--green-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--green-primary)' : '2px solid transparent',
                background: 'transparent',
              }}>
              <span>{WEEK_LABELS[i]}</span>
              <span className="mt-0.5" style={{
                background: isTodayDay ? 'var(--green-primary)' : 'transparent',
                color: isTodayDay ? '#000' : 'inherit',
                borderRadius: '50%',
                width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: isTodayDay ? 700 : 500,
              }}>
                {day.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid area */}
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
          {/* Desktop grid */}
          <div className="hidden md:flex flex-col" style={{ minWidth: 900 }}>
            {/* Day headers – sticky */}
            <div className="flex sticky top-0 z-10 shrink-0"
              style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="shrink-0" style={{ width: 52 }} />
              {weekDays.map((day, i) => {
                const key      = WEEK_KEYS[i]
                const isTodayDay = toDateStr(day) === todayStr
                return (
                  <div key={i} className="flex-1 flex flex-col items-center py-2 border-l text-center"
                    style={{ borderColor: 'var(--border-subtle)', minWidth: 120 }}>
                    <span className="text-xs font-medium" style={{ color: isTodayDay ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                      {WEEK_LABELS[i]}
                    </span>
                    <span className="text-lg font-bold mt-0.5" style={{ color: isTodayDay ? 'var(--green-primary)' : 'var(--text-primary)' }}>
                      {day.getDate()}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {String(day.getMonth() + 1).padStart(2, '0')}/{day.getFullYear()}
                    </span>
                    <span className="text-[10px] mt-0.5 px-1.5 py-px rounded"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                      {minToTime(DAY_CFG[key].start)}–{minToTime(DAY_CFG[key].end)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Grid body */}
            <div className="flex" style={{ height: gridHeight }}>
              {/* Time labels */}
              <div className="relative shrink-0" style={{ width: 52, height: gridHeight }}>
                {hourLabels.map(({ label, top }) => (
                  <div key={label} className="absolute right-2 text-[10px] -translate-y-2"
                    style={{ top, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {label}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((_, i) => renderDayColumn(i))}
            </div>
          </div>

          {/* Mobile: single day */}
          <div className="md:hidden flex flex-col">
            {/* Mobile grid body */}
            <div className="flex" style={{ height: gridHeight }}>
              {/* Time labels */}
              <div className="relative shrink-0" style={{ width: 44, height: gridHeight }}>
                {hourLabels.map(({ label, top }) => (
                  <div key={label} className="absolute right-1.5 text-[10px] -translate-y-2"
                    style={{ top, color: 'var(--text-muted)' }}>
                    {label}
                  </div>
                ))}
              </div>
              {/* Single day column */}
              {renderDayColumn(mobileDayIdx)}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: available slots button */}
      <div className="md:hidden p-3 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={() => setModal({ type: 'slots' })}
          className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
          style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>
          Ver horários disponíveis
        </button>
      </div>

      {/* ── Modals ── */}
      {modal?.type === 'add' && (
        <AddEventModal
          dayIdx={modal.dayIdx} date={modal.date} timeMin={modal.timeMin}
          alunos={alunos} onClose={() => setModal(null)} onSaved={addEvento}
        />
      )}

      {modal?.type === 'aluno-card' && (
        <AlunoCardModal
          aluno={modal.aluno} dayIdx={modal.dayIdx} date={modal.date}
          eventos={eventos}
          onClose={() => setModal(null)}
          onReagendar={() => setModal({ type: 'add', dayIdx: modal.dayIdx, date: modal.date, timeMin: timeToMin(modal.aluno.horario_inicio) })}
          onCancelado={addEvento}
          onSaved={addEvento}
        />
      )}

      {modal?.type === 'evento-card' && (
        <EventoCardModal
          evento={modal.evento} alunoNome={modal.alunoNome}
          onClose={() => setModal(null)}
          onDeleted={removeEvento}
          onEditar={() => setModal({ type: 'edit', evento: modal.evento })}
        />
      )}

      {modal?.type === 'edit' && (
        <EditEventoModal
          evento={modal.evento}
          onClose={() => setModal(null)}
          onSaved={(ev) => { updateEvento(ev) }}
        />
      )}

      {modal?.type === 'slots' && (
        <AvailableSlotsModal
          weekDays={weekDays} alunos={alunos} eventos={eventos}
          onClose={() => setModal(null)}
          onSlotClick={(di, dt, tm) => setModal({ type: 'add', dayIdx: di, date: dt, timeMin: tm })}
        />
      )}
    </div>
  )
}
