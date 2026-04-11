'use client'

import { useState } from 'react'
import {
  createFaltaAction,
  resolveFaltaAction,
  deleteFaltaAction,
  savePreferenciasAction,
  getFaltasAction,
  type FaltaRow,
  type PrefsF,
} from './actions'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function diasRestantes(prazo: string): number {
  const diff = new Date(prazo + 'T12:00:00').getTime() - new Date(today() + 'T12:00:00').getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function urgencyColor(falta: FaltaRow, alertaDias: number): string {
  if (falta.status !== 'pendente') return 'var(--text-muted)'
  const dias = diasRestantes(falta.prazo_vencimento)
  if (dias < 0) return '#FF5252'
  if (dias <= alertaDias) return '#FFAB00'
  return '#00E676'
}

function urgencyBg(falta: FaltaRow, alertaDias: number): string {
  if (falta.status !== 'pendente') return 'transparent'
  const dias = diasRestantes(falta.prazo_vencimento)
  if (dias < 0) return 'rgba(255,82,82,0.08)'
  if (dias <= alertaDias) return 'rgba(255,171,0,0.08)'
  return 'rgba(0,230,118,0.06)'
}

function statusLabel(status: FaltaRow['status']): { label: string; color: string; bg: string } {
  switch (status) {
    case 'pendente': return { label: 'Pendente',  color: '#FFAB00', bg: 'rgba(255,171,0,0.12)' }
    case 'reposta':  return { label: 'Reposta',   color: '#00E676', bg: 'rgba(0,230,118,0.12)' }
    case 'credito':  return { label: 'Crédito',   color: '#40C4FF', bg: 'rgba(64,196,255,0.12)' }
    case 'vencida':  return { label: 'Vencida',   color: '#FF5252', bg: 'rgba(255,82,82,0.12)' }
  }
}

function culpaLabel(culpa: FaltaRow['culpa']): string {
  return culpa === 'aluno' ? 'Aluno' : 'Professor'
}

// ─── NovaFaltaModal ───────────────────────────────────────────────────────────

function NovaFaltaModal({
  alunos,
  prazo_dias,
  onClose,
  onSaved,
}: {
  alunos: { id: string; nome: string }[]
  prazo_dias: number
  onClose: () => void
  onSaved: (f: FaltaRow) => void
}) {
  const [alunoId, setAlunoId] = useState(alunos[0]?.id ?? '')
  const [dataFalta, setDataFalta] = useState(today())
  const [culpa, setCulpa] = useState<'aluno' | 'professor'>('aluno')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!alunoId) { setError('Selecione um aluno.'); return }
    setSaving(true)
    const res = await createFaltaAction({ aluno_id: alunoId, data_falta: dataFalta, culpa, prazo_dias, observacao: obs || undefined })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onSaved(res.data!)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl p-6 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Registrar Falta</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Aluno */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Aluno</label>
            <select
              value={alunoId}
              onChange={e => setAlunoId(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>

          {/* Data */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Data da Falta</label>
            <input
              type="date"
              value={dataFalta}
              max={today()}
              onChange={e => setDataFalta(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Culpa */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Responsabilidade</label>
            <div className="flex gap-2">
              {(['aluno', 'professor'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCulpa(c)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={culpa === c
                    ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.3)' }
                    : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                  }
                >
                  {c === 'aluno' ? 'Aluno' : 'Professor'}
                </button>
              ))}
            </div>
          </div>

          {/* Prazo info */}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Prazo para reposição: <strong style={{ color: 'var(--text-secondary)' }}>{prazo_dias} dias</strong> após a falta
          </p>

          {/* Observação */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Observação (opcional)</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              className="rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#FF5252' }}>{error}</p>}

          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity" style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ResolverModal ────────────────────────────────────────────────────────────

function ResolverModal({
  falta,
  onClose,
  onSaved,
}: {
  falta: FaltaRow
  onClose: () => void
  onSaved: (id: string, updates: Partial<FaltaRow>) => void
}) {
  const [tipo, setTipo] = useState<'reposta' | 'credito'>('reposta')
  const [dataRep, setDataRep] = useState(today())
  const [creditoValor, setCreditoValor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let res: { error?: string }
    if (tipo === 'reposta') {
      res = await resolveFaltaAction(falta.id, { tipo: 'reposta', data_reposicao: dataRep })
    } else {
      const val = parseFloat(creditoValor.replace(',', '.'))
      if (!val || val <= 0) { setError('Informe um valor válido.'); setSaving(false); return }
      res = await resolveFaltaAction(falta.id, { tipo: 'credito', credito_valor: val })
    }

    setSaving(false)
    if (res.error) { setError(res.error); return }

    if (tipo === 'reposta') {
      onSaved(falta.id, { status: 'reposta', data_reposicao: dataRep })
    } else {
      onSaved(falta.id, { status: 'credito', credito_valor: parseFloat(creditoValor.replace(',', '.')) })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl p-6 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Resolver Falta</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {falta.aluno_nome} · {fmtDate(falta.data_falta)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(['reposta', 'credito'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={tipo === t
                  ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.3)' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                }
              >
                {t === 'reposta' ? '📅 Repor Aula' : '💳 Gerar Crédito'}
              </button>
            ))}
          </div>

          {tipo === 'reposta' ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Data da Reposição</label>
              <input
                type="date"
                value={dataRep}
                min={today()}
                onChange={e => setDataRep(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                A reposição será registrada na agenda automaticamente.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Valor do Crédito (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={creditoValor}
                onChange={e => setCreditoValor(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                O crédito será exibido no módulo de Cobrança e descontado da próxima mensalidade.
              </p>
            </div>
          )}

          {error && <p className="text-xs" style={{ color: '#FF5252' }}>{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PreferenciasModal ────────────────────────────────────────────────────────

function PreferenciasModal({
  prefs,
  onClose,
  onSaved,
}: {
  prefs: PrefsF
  onClose: () => void
  onSaved: (p: PrefsF) => void
}) {
  const [ativo, setAtivo] = useState(prefs.ativo)
  const [prazo, setPrazo] = useState(String(prefs.prazo_dias))
  const [alerta, setAlerta] = useState(String(prefs.alerta_dias))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const PRAZO_OPTS = [15, 20, 30, 45, 60]

  async function handleSave() {
    const prazoN = parseInt(prazo)
    const alertaN = parseInt(alerta)
    if (!prazoN || prazoN < 1) { setError('Prazo inválido.'); return }
    if (!alertaN || alertaN < 1) { setError('Dias de alerta inválidos.'); return }
    setSaving(true)
    const res = await savePreferenciasAction({ ativo, prazo_dias: prazoN, alerta_dias: alertaN })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onSaved({ ativo, prazo_dias: prazoN, alerta_dias: alertaN })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl p-6 flex flex-col gap-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Preferências de Faltas</h2>

        {/* Toggle ativo */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Módulo ativo</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Habilita o controle de faltas e reposições</p>
          </div>
          <button
            type="button"
            onClick={() => setAtivo(!ativo)}
            className="relative w-10 h-6 rounded-full transition-colors"
            style={{ background: ativo ? 'var(--green-primary)' : 'var(--bg-input)' }}
          >
            <span
              className="absolute top-1 w-4 h-4 rounded-full transition-transform"
              style={{ background: '#fff', left: ativo ? '22px' : '2px' }}
            />
          </button>
        </div>

        {/* Prazo */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Prazo para reposição</label>
          <div className="flex gap-2 flex-wrap">
            {PRAZO_OPTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPrazo(String(p))}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={prazo === String(p)
                  ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.3)' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                }
              >
                {p}d
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="120"
              value={PRAZO_OPTS.includes(parseInt(prazo)) ? '' : prazo}
              placeholder="Outro"
              onChange={e => setPrazo(e.target.value)}
              className="w-20 px-2 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Alerta */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Alerta de urgência (dias antes do prazo)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={alerta}
            onChange={e => setAlerta(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none w-24"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Faltas ficam amarelas quando restam ≤ {alerta || '?'} dias para o prazo.
          </p>
        </div>

        {error && <p className="text-xs" style={{ color: '#FF5252' }}>{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FaltaCard ────────────────────────────────────────────────────────────────

function FaltaCard({
  falta,
  alertaDias,
  onResolve,
  onDelete,
}: {
  falta: FaltaRow
  alertaDias: number
  onResolve: (f: FaltaRow) => void
  onDelete: (id: string) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const st = statusLabel(falta.status)
  const dias = falta.status === 'pendente' ? diasRestantes(falta.prazo_vencimento) : null

  async function handleDelete() {
    setDeleting(true)
    await deleteFaltaAction(falta.id)
    onDelete(falta.id)
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--bg-card)', border: `1px solid ${urgencyColor(falta, alertaDias)}22`, backgroundColor: urgencyBg(falta, alertaDias) || 'var(--bg-card)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{falta.aluno_nome}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Falta em {fmtDate(falta.data_falta)} · {culpaLabel(falta.culpa)}
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ color: st.color, background: st.bg }}>
          {st.label}
        </span>
      </div>

      {/* Urgency bar for pendente */}
      {falta.status === 'pendente' && dias !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, (dias / 30) * 100))}%`,
                background: urgencyColor(falta, alertaDias),
              }}
            />
          </div>
          <span className="text-xs shrink-0" style={{ color: urgencyColor(falta, alertaDias) }}>
            {dias < 0 ? `${Math.abs(dias)}d vencida` : dias === 0 ? 'Vence hoje' : `${dias}d restantes`}
          </span>
        </div>
      )}

      {/* Resolution details */}
      {falta.status === 'reposta' && falta.data_reposicao && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reposta em {fmtDate(falta.data_reposicao)}</p>
      )}
      {falta.status === 'credito' && falta.credito_valor != null && (
        <p className="text-xs" style={{ color: '#40C4FF' }}>
          Crédito: {Number(falta.credito_valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      )}
      {falta.observacao && (
        <p className="text-xs italic truncate" style={{ color: 'var(--text-muted)' }}>{falta.observacao}</p>
      )}

      {/* Actions */}
      {falta.status === 'pendente' && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onResolve(falta)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}
          >
            Resolver
          </button>
          {confirmDel ? (
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252' }}>
              {deleting ? '…' : 'Confirmar'}
            </button>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              Excluir
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Faltas component ────────────────────────────────────────────────────

interface Props {
  alunos: { id: string; nome: string }[]
  faltasIniciais: FaltaRow[]
  prefsIniciais: PrefsF
}

type Modal =
  | { type: 'nova' }
  | { type: 'resolver'; falta: FaltaRow }
  | { type: 'prefs' }

type Tab = 'pendentes' | 'historico'

export function Faltas({ alunos, faltasIniciais, prefsIniciais }: Props) {
  const [faltas, setFaltas] = useState<FaltaRow[]>(faltasIniciais)
  const [prefs, setPrefs] = useState<PrefsF>(prefsIniciais)
  const [modal, setModal] = useState<Modal | null>(null)
  const [tab, setTab] = useState<Tab>('pendentes')
  const [filterAluno, setFilterAluno] = useState('')
  const [loading, setLoading] = useState(false)

  // Stats
  const pendentes = faltas.filter(f => f.status === 'pendente')
  const urgentes  = pendentes.filter(f => diasRestantes(f.prazo_vencimento) <= prefs.alerta_dias)
  const vencidas  = faltas.filter(f => f.status === 'vencida')
  const creditosTotal = faltas
    .filter(f => f.status === 'credito')
    .reduce((s, f) => s + Number(f.credito_valor ?? 0), 0)

  // Filtered lists
  const filterFn = (f: FaltaRow) => !filterAluno || f.aluno_id === filterAluno

  const pendentesFiltered = pendentes.filter(filterFn)
    .sort((a, b) => new Date(a.prazo_vencimento).getTime() - new Date(b.prazo_vencimento).getTime())

  const historicoFiltered = faltas
    .filter(f => f.status !== 'pendente' && filterFn(f))
    .sort((a, b) => new Date(b.data_falta).getTime() - new Date(a.data_falta).getTime())

  async function handleRefresh() {
    setLoading(true)
    const res = await getFaltasAction()
    setLoading(false)
    if (res.data) setFaltas(res.data)
  }

  function handleFaltaAdded(f: FaltaRow) {
    setFaltas(prev => [f, ...prev])
    setModal(null)
  }

  function handleFaltaResolved(id: string, updates: Partial<FaltaRow>) {
    setFaltas(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    setModal(null)
  }

  function handleFaltaDeleted(id: string) {
    setFaltas(prev => prev.filter(f => f.id !== id))
  }

  function handlePrefsSaved(p: PrefsF) {
    setPrefs(p)
    setModal(null)
  }

  // ── Disabled state ──────────────────────────────────────────────────────────
  if (!prefs.ativo) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full gap-6 py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Controle de Faltas desativado</h2>
            <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Ative o módulo para registrar faltas, acompanhar reposições e gerar créditos para seus alunos.
            </p>
          </div>
          <button
            onClick={() => setModal({ type: 'prefs' })}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--green-primary)', color: '#000' }}
          >
            Ativar Módulo
          </button>
        </div>

        {modal?.type === 'prefs' && (
          <PreferenciasModal prefs={prefs} onClose={() => setModal(null)} onSaved={handlePrefsSaved} />
        )}
      </>
    )
  }

  // ── Active state ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-5 p-4 md:p-6 max-w-3xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Faltas e Reposições</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Prazo: {prefs.prazo_dias} dias · Alerta: {prefs.alerta_dias} dias</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModal({ type: 'prefs' })}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
              title="Preferências"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              onClick={() => setModal({ type: 'nova' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--green-primary)', color: '#000' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Registrar Falta
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pendentes', value: pendentes.length, color: '#FFAB00' },
            { label: 'Urgentes', value: urgentes.length, color: '#FF5252' },
            { label: 'Vencidas', value: vencidas.length, color: '#FF5252' },
            { label: 'Créditos', value: creditosTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: '#40C4FF' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterAluno}
            onChange={e => setFilterAluno(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <option value="">Todos os alunos</option>
            {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="ml-auto px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {([
            { key: 'pendentes', label: `Pendentes (${pendentesFiltered.length})` },
            { key: 'historico', label: `Histórico (${historicoFiltered.length})` },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
              style={tab === t.key
                ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {tab === 'pendentes' && (
          <div className="flex flex-col gap-3">
            {pendentesFiltered.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">Nenhuma falta pendente</p>
              </div>
            ) : (
              pendentesFiltered.map(f => (
                <FaltaCard
                  key={f.id}
                  falta={f}
                  alertaDias={prefs.alerta_dias}
                  onResolve={f => setModal({ type: 'resolver', falta: f })}
                  onDelete={handleFaltaDeleted}
                />
              ))
            )}
          </div>
        )}

        {tab === 'historico' && (
          <div className="flex flex-col gap-3">
            {historicoFiltered.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">Nenhum histórico encontrado</p>
              </div>
            ) : (
              historicoFiltered.map(f => (
                <FaltaCard
                  key={f.id}
                  falta={f}
                  alertaDias={prefs.alerta_dias}
                  onResolve={f => setModal({ type: 'resolver', falta: f })}
                  onDelete={handleFaltaDeleted}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'nova' && (
        <NovaFaltaModal
          alunos={alunos}
          prazo_dias={prefs.prazo_dias}
          onClose={() => setModal(null)}
          onSaved={handleFaltaAdded}
        />
      )}
      {modal?.type === 'resolver' && (
        <ResolverModal
          falta={modal.falta}
          onClose={() => setModal(null)}
          onSaved={handleFaltaResolved}
        />
      )}
      {modal?.type === 'prefs' && (
        <PreferenciasModal
          prefs={prefs}
          onClose={() => setModal(null)}
          onSaved={handlePrefsSaved}
        />
      )}
    </>
  )
}
