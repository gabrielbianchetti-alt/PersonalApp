import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  /** Texto curto do alerta (ex: "3 cobranças vencidas precisam de atenção"). */
  message: string
  /** CTA de resolução. Pode ser link (string href) ou botão (onClick). */
  action: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Ícone à esquerda. Default: AlertTriangle. */
  icon?: ReactNode
}

/**
 * Banner contextual no topo da tela quando há ação pendente que motivou o
 * usuário a chegar aqui via badge da sidebar. Vermelho discreto — explica
 * o quê + oferece atalho direto. Server-component-friendly (não tem state).
 */
export function AlertBanner({ message, action, icon }: Props) {
  const inner = (
    <span className="text-xs font-bold whitespace-nowrap">
      {action.label} →
    </span>
  )
  return (
    <div
      className="mx-4 md:mx-6 mt-4 mb-2 rounded-xl px-4 py-3 flex items-center gap-3"
      style={{
        background: 'rgba(239,68,68,0.10)',
        border: '1px solid rgba(239,68,68,0.30)',
      }}
    >
      <span className="shrink-0" style={{ color: '#EF4444' }}>
        {icon ?? <AlertTriangle size={18} strokeWidth={1.75} aria-hidden />}
      </span>
      <p className="text-sm font-semibold flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
        {message}
      </p>
      {action.href ? (
        <a
          href={action.href}
          className="shrink-0 px-3 py-1.5 rounded-lg"
          style={{ background: '#EF4444', color: '#fff', textDecoration: 'none' }}
        >
          {inner}
        </a>
      ) : (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: '#EF4444', color: '#fff', border: 'none' }}
        >
          {inner}
        </button>
      )}
    </div>
  )
}
