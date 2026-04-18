'use client'

import { useState } from 'react'
import { createFaltaAction, resolveFaltaAction, type FaltaRow } from './actions'

// ─── shared constants ─────────────────────────────────────────────────────────

const FALTA_COLOR        = '#FF5252'
const CANCELAMENTO_COLOR = '#FF9800'
const PROFESSOR_COLOR    = '#7C4DFF'

type SelectedFaltaTipo = 'aluno-faltou' | 'cancelamento' | 'professor-cancelou'
type Step              = 'menu' | 'options' | 'credito' | 'done'

const FALTA_TIPO_CFG: Record<SelectedFaltaTipo, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  'aluno-faltou':       { label: 'Aluno faltou',                  emoji: '🔴', color: FALTA_COLOR,        bg: 'rgba(255,82,82,0.06)',  border: 'rgba(255,82,82,0.25)' },
  'cancelamento':       { label: 'Cancelamento com antecedência', emoji: '🟠', color: CANCELAMENTO_COLOR, bg: 'rgba(255,152,0,0.06)',  border: 'rgba(255,152,0,0.25)' },
  'professor-cancelou': { label: 'Professor cancelou',            emoji: '🟣', color: PROFESSOR_COLOR,    bg: 'rgba(124,77,255,0.06)', border: 'rgba(124,77,255,0.25)' },
}

function faltaCreateParams(t: SelectedFaltaTipo): { culpa: 'aluno' | 'professor'; tipo: 'falta' | 'cancelamento' } {
  if (t === 'cancelamento')       return { culpa: 'aluno',     tipo: 'cancelamento' }
  if (t === 'professor-cancelou') return { culpa: 'professor', tipo: 'falta' }
  return { culpa: 'aluno', tipo: 'falta' }
}

// ─── primitives (self-contained) ──────────────────────────────────────────────

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

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  alunoId:          string
  alunoNome:        string
  dataFalta:        string          // "YYYY-MM-DD"
  horario:          string          // "HH:MM"
  contextLabel?:    string          // e.g. "Hoje · 08:00"
  prazoFaltaDias?:  number          // default 30
  existingFalta?:   FaltaRow | null
  onClose:          () => void
  onFaltaRegistrada?: (f: FaltaRow) => void
  onGoToFaltas?:    () => void
}

// ─── component ────────────────────────────────────────────────────────────────

export function FaltaQuickActionModal({
  alunoId,
  alunoNome,
  dataFalta,
  horario,
  contextLabel,
  prazoFaltaDias = 30,
  existingFalta = null,
  onClose,
  onFaltaRegistrada,
  onGoToFaltas,
}: Props) {
  const [step,        setStep]        = useState<Step>('menu')
  const [faltaTipo,   setFaltaTipo]   = useState<SelectedFaltaTipo | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [creditoValor, setCreditoValor] = useState('')
  const [doneMsg,     setDoneMsg]     = useState('')
  const [err,         setErr]         = useState('')

  // ── existing falta info (optional) ───────────────────────────────────────────
  const existingColor = existingFalta
    ? (existingFalta.tipo === 'cancelamento' ? CANCELAMENTO_COLOR : existingFalta.culpa === 'professor' ? PROFESSOR_COLOR : FALTA_COLOR)
    : null
  const existingEmoji = existingFalta
    ? (existingFalta.tipo === 'cancelamento' ? '🟠' : existingFalta.culpa === 'professor' ? '🟣' : '🔴')
    : null
  const existingLabel = existingFalta
    ? (existingFalta.tipo === 'cancelamento' ? 'Cancelamento antecipado' : existingFalta.culpa === 'professor' ? 'Professor cancelou' : 'Aluno faltou')
    : null

  // ── helpers ──────────────────────────────────────────────────────────────────
  async function createFalta(t: SelectedFaltaTipo): Promise<FaltaRow | null> {
    const params = faltaCreateParams(t)
    const res = await createFaltaAction({
      aluno_id: alunoId,
      data_falta: dataFalta,
      culpa: params.culpa,
      tipo: params.tipo,
      horario_falta: horario,
      prazo_dias: prazoFaltaDias,
    })
    if (res.error) { setErr(res.error); return null }
    onFaltaRegistrada?.(res.data!)
    return res.data!
  }

  function handleSelectTipo(t: SelectedFaltaTipo) {
    setFaltaTipo(t); setErr(''); setStep('options')
  }

  async function handleRemarcar() {
    if (!faltaTipo) return
    setSaving(true); setErr('')
    const falta = await createFalta(faltaTipo)
    setSaving(false)
    if (!falta) return
    onClose()
    onGoToFaltas?.()
  }

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
    onFaltaRegistrada?.({ ...falta, status: 'credito', credito_valor: val })
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
    onFaltaRegistrada?.({ ...falta, status: 'cobranca' })
    setDoneMsg('Cobrança mantida. Nenhum crédito ou remarcação foi gerado.')
    setStep('done')
  }

  const tipoBadge = faltaTipo ? (() => {
    const cfg = FALTA_TIPO_CFG[faltaTipo]
    return (
      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <p className="font-semibold" style={{ color: cfg.color }}>{cfg.emoji} {cfg.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {alunoNome.split(' ')[0]}{contextLabel ? ` · ${contextLabel}` : ''}{horario ? ` · ${horario}` : ''}
        </p>
      </div>
    )
  })() : null

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={alunoNome} onClose={onClose} />
      <div className="p-5 flex flex-col gap-4">

        {/* STEP: menu — choose falta type */}
        {step === 'menu' && (
          <>
            {contextLabel && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Aula</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{contextLabel}{horario ? ` · ${horario}` : ''}</p>
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
                  style={{ background: 'rgba(255,82,82,0.08)', color: FALTA_COLOR, border: '1px solid rgba(255,82,82,0.25)' }}>
                  <span className="text-base">🔴</span>
                  <div>
                    <div>Aluno faltou</div>
                    <div className="text-xs font-normal opacity-70">Não compareceu sem avisar</div>
                  </div>
                </button>
                <button onClick={() => handleSelectTipo('cancelamento')}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer text-left px-4 flex items-center gap-3"
                  style={{ background: 'rgba(255,152,0,0.08)', color: CANCELAMENTO_COLOR, border: '1px solid rgba(255,152,0,0.25)' }}>
                  <span className="text-base">🟠</span>
                  <div>
                    <div>Cancelamento com antecedência</div>
                    <div className="text-xs font-normal opacity-70">Aluno avisou com antecedência</div>
                  </div>
                </button>
                <button onClick={() => handleSelectTipo('professor-cancelou')}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer text-left px-4 flex items-center gap-3"
                  style={{ background: 'rgba(124,77,255,0.08)', color: PROFESSOR_COLOR, border: '1px solid rgba(124,77,255,0.25)' }}>
                  <span className="text-base">🟣</span>
                  <div>
                    <div>Professor cancelou</div>
                    <div className="text-xs font-normal opacity-70">O professor não pôde dar a aula</div>
                  </div>
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP: options — 3 resolution choices */}
        {step === 'options' && faltaTipo && (
          <>
            {tipoBadge}
            <div className="flex flex-col gap-2">
              <button onClick={handleRemarcar} disabled={saving}
                className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(224, 176, 102,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {saving ? 'Registrando...' : 'Remarcar'}
              </button>
              <button onClick={() => setStep('credito')} disabled={saving}
                className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'rgba(64,196,255,0.1)', color: '#40C4FF', border: '1px solid rgba(64,196,255,0.2)' }}>
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
            {err && <p className="text-xs" style={{ color: '#FF5252' }}>{err}</p>}
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
            {err && <p className="text-xs" style={{ color: '#FF5252' }}>{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setStep('options'); setErr('') }}
                className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                ← Voltar
              </button>
              <button onClick={handleConfirmCredito} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: '#40C4FF22', color: '#40C4FF', border: '1px solid rgba(64,196,255,0.3)' }}>
                {saving ? 'Salvando...' : '💳 Confirmar Crédito'}
              </button>
            </div>
          </>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <>
            <div className="rounded-xl p-4 text-center flex flex-col gap-2"
              style={{ background: 'rgba(224, 176, 102,0.06)', border: '1px solid rgba(224, 176, 102,0.2)' }}>
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
