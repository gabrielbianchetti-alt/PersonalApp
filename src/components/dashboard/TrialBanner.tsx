'use client'

import Link from 'next/link'
import type { AssinaturaData } from '@/app/dashboard/configuracoes/assinatura-actions'

function daysUntil(iso: string | null): number {
  if (!iso) return 0
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

interface Props {
  assinatura: AssinaturaData
  isAdmin: boolean
}

export function TrialBanner({ assinatura, isAdmin }: Props) {
  if (isAdmin) return null
  const { status, trial_fim, periodo_fim } = assinatura

  // Active with no issues — no banner needed
  if (status === 'active') return null

  let bg = 'rgba(16, 185, 129,0.08)'
  let border = 'rgba(16, 185, 129,0.25)'
  let textColor = 'var(--green-primary)'
  let icon = '🟢'
  let message = ''
  let urgent = false

  if (status === 'trial') {
    const days = daysUntil(trial_fim)
    if (days === 0) {
      icon = '🔴'
      bg = 'rgba(239, 68, 68,0.08)'
      border = 'rgba(239, 68, 68,0.25)'
      textColor = '#EF4444'
      message = 'Seu período de teste expirou. Assine para continuar.'
      urgent = true
    } else if (days <= 2) {
      icon = '🔴'
      bg = 'rgba(239, 68, 68,0.08)'
      border = 'rgba(239, 68, 68,0.25)'
      textColor = '#EF4444'
      message = `Teste grátis: ${days} dia${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}. Assine agora para não perder o acesso.`
      urgent = true
    } else if (days <= 4) {
      icon = '🟡'
      bg = 'rgba(245, 158, 11,0.08)'
      border = 'rgba(245, 158, 11,0.25)'
      textColor = '#F59E0B'
      message = `Teste grátis: ${days} dias restantes.`
    } else {
      message = `Teste grátis: ${days} dias restantes.`
    }
  } else if (status === 'past_due') {
    icon = '🔴'
    bg = 'rgba(239, 68, 68,0.08)'
    border = 'rgba(239, 68, 68,0.25)'
    textColor = '#EF4444'
    message = 'Pagamento pendente. Regularize sua assinatura para evitar bloqueio.'
    urgent = true
  } else if (status === 'canceled') {
    const days = daysUntil(periodo_fim)
    icon = '🟡'
    bg = 'rgba(245, 158, 11,0.08)'
    border = 'rgba(245, 158, 11,0.25)'
    textColor = '#F59E0B'
    message = days > 0
      ? `Assinatura cancelada. Acesso até ${new Date(periodo_fim!).toLocaleDateString('pt-BR')}.`
      : 'Assinatura cancelada. Reative para continuar usando.'
  } else {
    return null
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-medium"
      style={{
        background: bg,
        borderBottom: `1px solid ${border}`,
        color: textColor,
      }}
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span>{message}</span>
      </span>
      <Link
        href="/assinar"
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
        style={{
          background: urgent ? (status === 'past_due' ? '#EF4444' : textColor === '#EF4444' ? '#EF4444' : textColor) : textColor,
          color: '#000',
        }}
      >
        {status === 'past_due' ? 'Regularizar' : status === 'canceled' ? 'Reativar' : 'Assinar agora'}
      </Link>
    </div>
  )
}
