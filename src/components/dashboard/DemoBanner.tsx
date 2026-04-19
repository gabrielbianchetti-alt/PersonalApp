'use client'

import { useTransition } from 'react'
import { Sparkles, X } from 'lucide-react'
import { desativarDemoAction } from '@/lib/demo/actions'

export function DemoBanner() {
  const [pending, startTransition] = useTransition()

  function sair() {
    startTransition(async () => {
      await desativarDemoAction()
      // Força reload completo para limpar o estado (incluindo forms em memória)
      window.location.href = '/dashboard'
    })
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
      style={{
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.08))',
        borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
        color: 'var(--green-primary)',
      }}
    >
      <Sparkles size={14} strokeWidth={1.75} aria-hidden />
      <span className="flex-1 truncate">
        Modo demonstração — dados fictícios
      </span>
      <button
        type="button"
        onClick={sair}
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-50"
        style={{
          background: 'rgba(16, 185, 129, 0.2)',
          color: 'var(--green-primary)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
        }}
      >
        <X size={12} strokeWidth={2} aria-hidden />
        {pending ? 'Saindo…' : 'Sair do modo demo'}
      </button>
    </div>
  )
}
