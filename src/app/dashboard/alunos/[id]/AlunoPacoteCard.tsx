'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, AlertTriangle, CheckCircle2, X, Calendar } from 'lucide-react'
import { formatCurrency, formatDate, addDays } from '@/types/aluno'
import { renovarPacoteAction, type PacoteRow, type AulaUsada } from '../../pacotes/actions'

const STATUS_CFG: Record<'ativo' | 'vencido' | 'finalizado', { label: string; color: string; bg: string }> = {
  ativo:       { label: 'Ativo',      color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  vencido:     { label: 'Vencido',    color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  finalizado:  { label: 'Finalizado', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.12)' },
}

function daysBetween(iso1: string, iso2: string): number {
  const d1 = new Date(iso1 + 'T12:00:00')
  const d2 = new Date(iso2 + 'T12:00:00')
  return Math.round((d1.getTime() - d2.getTime()) / 86_400_000)
}

export function AlunoPacoteCard({
  pacote, aulas, alunoNome,
}: {
  pacote: PacoteRow | null
  aulas: AulaUsada[]
  alunoNome: string
}) {
  const [renovarOpen, setRenovarOpen] = useState(false)

  // Sem pacote cadastrado — mostra apenas botão pra criar
  if (!pacote) {
    return (
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <Package size={20} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sem pacote ativo</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Este aluno é modelo pacote, mas não há pacote registrado.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const today       = new Date().toISOString().split('T')[0]
  const restantes   = Math.max(0, pacote.quantidade_total - pacote.quantidade_usada)
  const pct         = Math.min(100, Math.round((pacote.quantidade_usada / pacote.quantidade_total) * 100))
  const diasRest    = daysBetween(pacote.data_vencimento, today)
  const derivedStatus = (pacote.quantidade_usada >= pacote.quantidade_total ? 'finalizado'
                         : pacote.data_vencimento < today ? 'vencido' : 'ativo') as 'ativo'|'vencido'|'finalizado'
  const cfg         = STATUS_CFG[derivedStatus]
  const canMark     = derivedStatus === 'ativo' && restantes > 0

  return (
    <>
      <div className="rounded-2xl p-5 mb-4"
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${derivedStatus === 'vencido' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
        }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package size={18} strokeWidth={1.75} style={{ color: cfg.color }} aria-hidden />
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Pacote de aulas
            </p>
            <span className="text-[10px] px-1.5 py-px rounded-full font-semibold"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(pacote.valor)}
          </p>
        </div>

        {/* Aviso quando vencido/finalizado */}
        {derivedStatus !== 'ativo' && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
            <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: cfg.color }} aria-hidden />
            <p className="text-xs" style={{ color: cfg.color }}>
              {derivedStatus === 'vencido'
                ? `Pacote venceu em ${formatDate(pacote.data_vencimento)}${restantes > 0 ? ` — ${restantes} aula${restantes === 1 ? '' : 's'} não utilizada${restantes === 1 ? '' : 's'}` : ''}.`
                : `Pacote finalizado. Todas as ${pacote.quantidade_total} aulas foram utilizadas.`}
              {' '}Renove para continuar marcando aulas.
            </p>
          </div>
        )}

        {/* Aulas restantes + progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {restantes} de {pacote.quantidade_total} aulas restantes
            </span>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {pct}% usado
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: cfg.color }} />
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Início</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {formatDate(pacote.data_inicio)}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vence</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: derivedStatus === 'vencido' ? '#EF4444' : 'var(--text-primary)' }}>
              {formatDate(pacote.data_vencimento)}
            </p>
            {derivedStatus === 'ativo' && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {diasRest === 0 ? 'hoje' : diasRest === 1 ? '1 dia' : `${diasRest} dias`}
              </p>
            )}
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cobrança</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {formatDate(pacote.data_cobranca)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {canMark && (
            <Link href="/dashboard/agenda"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <Calendar size={14} strokeWidth={1.75} aria-hidden /> Marcar aula
            </Link>
          )}
          <button onClick={() => setRenovarOpen(true)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={canMark
              ? { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
              : { background: 'var(--green-primary)', color: '#000' }
            }>
            Renovar pacote
          </button>
        </div>

        {/* Histórico de aulas usadas */}
        {aulas.length > 0 && (
          <details className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <summary className="text-xs font-semibold cursor-pointer select-none"
              style={{ color: 'var(--text-secondary)' }}>
              Histórico ({aulas.length} aula{aulas.length === 1 ? '' : 's'})
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {aulas.map(a => (
                <div key={a.evento_id} className="flex justify-between text-xs"
                  style={{ color: 'var(--text-secondary)' }}>
                  <span>{a.data_especifica ? formatDate(a.data_especifica) : '—'}</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {a.horario_inicio} · {a.duracao} min
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {renovarOpen && (
        <RenovarPacoteInlineModal
          pacote={pacote}
          alunoNome={alunoNome}
          onClose={() => setRenovarOpen(false)}
        />
      )}
    </>
  )
}

// ─── Inline renewal modal (self-contained) ─────────────────────────────────────

function RenovarPacoteInlineModal({
  pacote, alunoNome, onClose,
}: {
  pacote: PacoteRow
  alunoNome: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const hoje = new Date().toISOString().split('T')[0]
  const [qtd,       setQtd]       = useState(String(pacote.quantidade_total))
  const [valor,     setValor]     = useState(String(pacote.valor))
  const [validade,  setValidade]  = useState(String(pacote.validade_dias))
  const [inicio,    setInicio]    = useState(hoje)
  const [cobranca,  setCobranca]  = useState(hoje)
  const [transferir, setTransferir] = useState(false)
  const [err, setErr] = useState('')

  const saldo = Math.max(0, pacote.quantidade_total - pacote.quantidade_usada)
  const vencimento = addDays(inicio, parseInt(validade) || 30)

  function handleSave() {
    startTransition(async () => {
      setErr('')
      const res = await renovarPacoteAction({
        pacoteAnteriorId: pacote.id,
        quantidade_total: parseInt(qtd) || 0,
        valor:            parseFloat(valor) || 0,
        validade_dias:    parseInt(validade) || 30,
        data_inicio:      inicio,
        data_cobranca:    cobranca,
        transferir_saldo: transferir,
      })
      if (res.error) { setErr(res.error); return }
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Renovar pacote</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{alunoNome}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-muted)' }}>
            <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Qtd. de aulas" type="number" value={qtd}      onChange={setQtd} />
            <Field label="Validade (dias)" type="number" value={validade} onChange={setValidade} />
          </div>
          <Field label="Valor (R$)" type="number" step="0.01" value={valor} onChange={setValor} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início"           type="date" value={inicio}   onChange={setInicio} />
            <Field label="Data de cobrança" type="date" value={cobranca} onChange={setCobranca} />
          </div>

          {saldo > 0 && (
            <label className="flex items-center gap-2 cursor-pointer py-2 rounded-lg">
              <input type="checkbox" checked={transferir} onChange={e => setTransferir(e.target.checked)}
                className="cursor-pointer"
                style={{ accentColor: 'var(--green-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Transferir {saldo} aula{saldo === 1 ? '' : 's'} restante{saldo === 1 ? '' : 's'} do pacote anterior
              </span>
            </label>
          )}

          <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
            <CheckCircle2 size={13} strokeWidth={1.75} aria-hidden />
            Novo pacote vence em <strong>{formatDate(vencimento)}</strong>
          </div>

          {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}

          <div className="flex gap-2 mt-2">
            <button onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--green-primary)', color: '#000' }}>
              {pending ? 'Salvando…' : 'Renovar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label, type = 'text', value, onChange, step,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; step?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} step={step} value={value} onChange={e => onChange(e.target.value)}
        className="h-11 rounded-xl px-3 text-sm outline-none"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }} />
    </div>
  )
}
