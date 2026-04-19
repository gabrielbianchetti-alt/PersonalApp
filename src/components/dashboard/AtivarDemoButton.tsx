'use client'

import { useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { ativarDemoAction } from '@/lib/demo/actions'

interface Props {
  variant?: 'primary' | 'secondary' | 'inline'
  label?: string
  className?: string
}

export function AtivarDemoButton({ variant = 'primary', label = 'Ver demonstração', className }: Props) {
  const [pending, startTransition] = useTransition()

  function ativar() {
    startTransition(async () => {
      await ativarDemoAction()
      window.location.href = '/dashboard'
    })
  }

  const baseCls = 'inline-flex items-center justify-center gap-2 font-semibold cursor-pointer disabled:opacity-60 transition-colors'

  const style: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--green-primary)', color: '#000', padding: '10px 18px', borderRadius: 14, fontSize: 14 }
      : variant === 'inline'
      ? { background: 'var(--green-muted)', color: 'var(--green-primary)', padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: 12 }
      : { background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px 18px', borderRadius: 14, border: '1px solid var(--border-subtle)', fontSize: 14 }

  return (
    <button type="button" onClick={ativar} disabled={pending} className={`${baseCls} ${className ?? ''}`} style={style}>
      <Sparkles size={variant === 'inline' ? 12 : 16} strokeWidth={1.75} aria-hidden />
      {pending ? 'Carregando…' : label}
    </button>
  )
}
