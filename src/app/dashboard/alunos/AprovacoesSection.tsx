'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, UserX, Copy, Check, X, Clock, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate, DIAS_LABEL } from '@/types/aluno'
import {
  aprovarConviteAction, recusarConviteAction, cancelarConviteAction,
  type ConvitePendenteComAluno, type ConviteRow,
} from '../convites/actions'

const MODELO_LABEL: Record<string, string> = {
  por_aula:    'Por aula',
  mensalidade: 'Mensalidade',
  pacote:      'Pacote',
}

// ─── Card de aluno aguardando aprovação ──────────────────────────────────────

export function AprovacaoCard({ convite, onChanged }: {
  convite: ConvitePendenteComAluno
  onChanged: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState('')
  const aluno = convite.aluno

  function aprovar() {
    startTransition(async () => {
      setErr('')
      const res = await aprovarConviteAction(convite.id)
      if (res.error) { setErr(res.error); return }
      onChanged()
      router.refresh()
    })
  }

  function recusar() {
    if (!confirm('Recusar este cadastro? Os dados preenchidos pelo aluno serão descartados.')) return
    startTransition(async () => {
      setErr('')
      const res = await recusarConviteAction(convite.id)
      if (res.error) { setErr(res.error); return }
      onChanged()
      router.refresh()
    })
  }

  if (!aluno) return null

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <Clock size={14} strokeWidth={2} style={{ color: '#F59E0B' }} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{aluno.nome}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#F59E0B' }}>
              Aguardando aprovação
            </p>
          </div>
        </div>
      </div>

      {/* Dados preenchidos pelo aluno */}
      <div className="grid grid-cols-2 gap-2">
        {aluno.whatsapp && (
          <div className="rounded-lg p-2" style={{ background: 'var(--bg-input)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>WhatsApp</p>
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{aluno.whatsapp}</p>
          </div>
        )}
        {aluno.data_nascimento && (
          <div className="rounded-lg p-2" style={{ background: 'var(--bg-input)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Nascimento</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(aluno.data_nascimento)}</p>
          </div>
        )}
      </div>

      {/* Objetivos */}
      {(aluno.objetivos?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(aluno.objetivos ?? []).map(o => (
            <span key={o} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
              {o}
            </span>
          ))}
        </div>
      )}

      {/* Restrições */}
      {aluno.restricoes && (
        <div className="rounded-lg p-2 flex items-start gap-2"
          style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
          <AlertTriangle size={12} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: '#F59E0B' }} aria-hidden />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{aluno.restricoes}</p>
        </div>
      )}

      {/* Config do professor (readonly) */}
      <div className="border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Config. da cobrança
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            {MODELO_LABEL[convite.modelo_cobranca] ?? convite.modelo_cobranca}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--green-primary)' }}>
            {formatCurrency(convite.valor)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{convite.local}</span>
          {convite.modelo_cobranca !== 'pacote' && convite.horarios.length > 0 && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {convite.horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')}
              </span>
            </>
          )}
        </div>
      </div>

      {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}

      {/* Ações */}
      <div className="flex gap-2">
        <button type="button" onClick={recusar} disabled={pending}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <UserX size={14} strokeWidth={1.75} aria-hidden />
          Recusar
        </button>
        <button type="button" onClick={aprovar} disabled={pending}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
          style={{ background: 'var(--green-primary)', color: '#000' }}>
          <UserCheck size={14} strokeWidth={1.75} aria-hidden />
          {pending ? 'Salvando…' : 'Aprovar'}
        </button>
      </div>
    </div>
  )
}

// ─── Card de convite pendente (aluno ainda não preencheu) ────────────────────

export function PendenteCard({ convite, onChanged }: {
  convite: ConviteRow
  onChanged: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${base}/convite/${convite.link_token}`

  const expiraEm = new Date(convite.data_expiracao).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  })
  const isExpirado = convite.status === 'expirado' || new Date(convite.data_expiracao) < new Date()

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignored */ }
  }

  function enviarWhats() {
    const msg = encodeURIComponent(`Olá! Preencha seus dados para começarmos os treinos: ${link}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function cancelar() {
    if (!confirm('Cancelar este convite? O link ficará inválido.')) return
    startTransition(async () => {
      const res = await cancelarConviteAction(convite.id)
      if (!res.error) { onChanged(); router.refresh() }
    })
  }

  return (
    <div className="rounded-2xl p-3 flex flex-col gap-2"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isExpirado ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-subtle)'}`,
        opacity: isExpirado ? 0.7 : 1,
      }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock size={14} strokeWidth={1.75}
            style={{ color: isExpirado ? '#EF4444' : 'var(--text-muted)' }} aria-hidden />
          <p className="text-xs font-semibold"
            style={{ color: isExpirado ? '#EF4444' : 'var(--text-secondary)' }}>
            {isExpirado ? 'Expirado' : 'Pendente'} · {MODELO_LABEL[convite.modelo_cobranca]} · {formatCurrency(convite.valor)}
          </p>
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {isExpirado ? 'Expirou' : 'Expira'} em {expiraEm}
        </p>
      </div>

      {!isExpirado && (
        <div className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: 'var(--bg-input)' }}>
          <span className="flex-1 text-xs font-mono truncate"
            style={{ color: 'var(--text-muted)' }}>
            {link}
          </span>
          <button type="button" onClick={copiar}
            className="shrink-0 h-7 px-2 rounded-md text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
            style={{
              background: copied ? 'var(--green-muted)' : 'transparent',
              color: copied ? 'var(--green-primary)' : 'var(--text-secondary)',
            }}>
            {copied ? <Check size={11} strokeWidth={2.5} aria-hidden /> : <Copy size={11} strokeWidth={2} aria-hidden />}
          </button>
        </div>
      )}

      {!isExpirado && (
        <div className="flex gap-2">
          <button type="button" onClick={enviarWhats}
            className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36630' }}>
            Enviar WhatsApp
          </button>
          <button type="button" onClick={cancelar} disabled={pending}
            className="py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            <X size={11} strokeWidth={2.5} aria-hidden />
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
