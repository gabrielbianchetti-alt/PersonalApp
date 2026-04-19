'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, addDays } from '@/types/aluno'
import {
  renovarPacoteAction,
  getPacoteAction,
  type PacoteComAluno,
  type AulaUsada,
} from './actions'

type Filter = 'ativo' | 'vencendo' | 'finalizado' | 'todos'

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

/** Classifica urgência para ordenação: 0 = vencendo em breve, 1 = ativo, 2 = vencido, 3 = finalizado */
function urgencyRank(p: PacoteComAluno, todayStr: string): number {
  const days = daysBetween(p.data_vencimento, todayStr)
  if (p.status === 'ativo' && days >= 0 && days <= 7) return 0
  if (p.status === 'ativo')     return 1
  if (p.status === 'vencido')   return 2
  return 3
}

export function PacotesHub({
  pacotes,
  initialError,
  embedded = false,
}: {
  pacotes: PacoteComAluno[]
  initialError: string | null
  /** When true, skips the page header (used when embedded inside Financeiro tab) */
  embedded?: boolean
}) {
  const [filter, setFilter] = useState<Filter>('ativo')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailsCache, setDetailsCache] = useState<Record<string, AulaUsada[]>>({})
  const [renovar, setRenovar] = useState<PacoteComAluno | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const filteredRaw = pacotes.filter(p => {
    if (filter === 'todos')      return true
    if (filter === 'ativo')      return p.status === 'ativo'
    if (filter === 'finalizado') return p.status === 'finalizado' || p.status === 'vencido'
    // vencendo: ativo com até 7 dias para vencer
    if (filter === 'vencendo') {
      if (p.status !== 'ativo') return false
      const days = daysBetween(p.data_vencimento, today)
      return days >= 0 && days <= 7
    }
    return true
  })

  // Sort by urgency, then by vencimento asc
  const filtered = [...filteredRaw].sort((a, b) => {
    const ra = urgencyRank(a, today)
    const rb = urgencyRank(b, today)
    if (ra !== rb) return ra - rb
    return a.data_vencimento.localeCompare(b.data_vencimento)
  })

  async function toggleExpand(p: PacoteComAluno) {
    if (expanded === p.id) {
      setExpanded(null)
      return
    }
    setExpanded(p.id)
    if (!detailsCache[p.id]) {
      const res = await getPacoteAction(p.id)
      if (res.data) {
        setDetailsCache(prev => ({ ...prev, [p.id]: res.data!.aulas }))
      }
    }
  }

  return (
    <div className={embedded ? 'p-4 md:p-6 flex flex-col' : 'p-4 md:p-6 flex flex-col'}
      style={{ gap: 16, maxWidth: 800, margin: '0 auto', width: '100%' }}>
      {/* Header — apenas no modo standalone */}
      {!embedded && (
        <div className="flex items-end justify-between px-1">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pacotes</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Pacotes de aulas avulsas dos seus alunos
            </p>
          </div>
        </div>
      )}

      {initialError && (
        <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
          {initialError}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl self-start flex-wrap" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        {([
          { id: 'ativo',      label: 'Ativos' },
          { id: 'vencendo',   label: 'Vencendo em breve' },
          { id: 'finalizado', label: 'Finalizados' },
          { id: 'todos',      label: 'Todos' },
        ] as const).map(f => {
          const n =
            f.id === 'todos'       ? pacotes.length :
            f.id === 'ativo'       ? pacotes.filter(p => p.status === 'ativo').length :
            f.id === 'finalizado'  ? pacotes.filter(p => p.status === 'finalizado' || p.status === 'vencido').length :
            /* vencendo */          pacotes.filter(p => {
                                      if (p.status !== 'ativo') return false
                                      const d = daysBetween(p.data_vencimento, today)
                                      return d >= 0 && d <= 7
                                    }).length
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              style={{
                background: filter === f.id ? 'var(--green-primary)' : 'transparent',
                color: filter === f.id ? '#000' : 'var(--text-secondary)',
              }}>
              {f.label} {n > 0 && <span style={{ opacity: 0.6 }}>({n})</span>}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum pacote</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Cadastre um aluno com modelo &ldquo;Pacote&rdquo; para começar
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => {
            const restantes = Math.max(0, p.quantidade_total - p.quantidade_usada)
            const pct       = Math.min(100, Math.round((p.quantidade_usada / p.quantidade_total) * 100))
            const diasRest  = daysBetween(p.data_vencimento, today)
            const status    = (p.quantidade_usada >= p.quantidade_total ? 'finalizado'
                               : p.data_vencimento < today ? 'vencido' : 'ativo') as 'ativo'|'vencido'|'finalizado'
            const cfg       = STATUS_CFG[status]
            const isExp     = expanded === p.id
            const aulas     = detailsCache[p.id] ?? []

            return (
              <div key={p.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/alunos`} className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {p.aluno_nome}
                        </Link>
                        <span className="text-[10px] px-1.5 py-px rounded-full font-semibold"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(p.valor)} · {p.quantidade_total} aulas · {p.validade_dias} dias
                      </p>
                    </div>
                    <button onClick={() => toggleExpand(p)}
                      className="text-xs font-medium cursor-pointer px-2 py-1 rounded-lg"
                      style={{ color: 'var(--text-secondary)', background: 'var(--bg-input)' }}>
                      {isExp ? 'Ocultar' : 'Detalhes'}
                    </button>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {restantes} de {p.quantidade_total} aulas restantes
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

                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span style={{ color: 'var(--text-muted)' }}>
                      Início: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(p.data_inicio)}</span>
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Vence: <span style={{ color: status === 'vencido' ? '#EF4444' : 'var(--text-secondary)' }}>
                        {formatDate(p.data_vencimento)}
                        {status === 'ativo' && diasRest >= 0 && (
                          <span style={{ marginLeft: 4, opacity: 0.7 }}>
                            ({diasRest === 0 ? 'hoje' : diasRest === 1 ? '1 dia' : `${diasRest} dias`})
                          </span>
                        )}
                      </span>
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Cobrança: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(p.data_cobranca)}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {status === 'ativo' && restantes > 0 && (
                      <Link href="/dashboard/agenda"
                        className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer text-center"
                        style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        + Marcar aula
                      </Link>
                    )}
                    {(status === 'finalizado' || status === 'vencido') && (
                      <button onClick={() => setRenovar(p)}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                        style={{ background: 'var(--green-primary)', color: '#000' }}>
                        Renovar pacote
                      </button>
                    )}
                  </div>

                  {/* Expanded — aulas usadas */}
                  {isExp && (
                    <div className="flex flex-col gap-1.5 pt-2 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Histórico de aulas usadas
                      </p>
                      {aulas.length === 0 ? (
                        <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Nenhuma aula marcada ainda</p>
                      ) : (
                        <div className="flex flex-col gap-1">
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Renovar modal */}
      {renovar && (
        <RenovarModal pacote={renovar} onClose={() => setRenovar(null)} />
      )}
    </div>
  )
}

function RenovarModal({ pacote, onClose }: { pacote: PacoteComAluno; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const hoje = new Date().toISOString().split('T')[0]
  const [qtd,       setQtd]       = useState(String(pacote.quantidade_total))
  const [valor,     setValor]     = useState(String(pacote.valor))
  const [validade,  setValidade]  = useState(String(pacote.validade_dias))
  const [inicio,    setInicio]    = useState(hoje)
  const [cobranca,  setCobranca]  = useState(hoje)
  const [transferir,setTransferir]= useState(false)
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pacote.aluno_nome}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Quantidade de aulas" type="number" value={qtd} onChange={setQtd} />
            <LabeledInput label="Validade (dias)"     type="number" value={validade} onChange={setValidade} />
          </div>
          <LabeledInput label="Valor (R$)" type="number" step="0.01" value={valor} onChange={setValor} />
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Início"          type="date" value={inicio} onChange={setInicio} />
            <LabeledInput label="Data de cobrança" type="date" value={cobranca} onChange={setCobranca} />
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

          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
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

function LabeledInput({
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
