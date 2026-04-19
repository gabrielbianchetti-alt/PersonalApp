'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * Toast global escutado via `window` event. Qualquer handler client-side
 * pode chamar `notifyDemoSimulated('Cadastro de aluno')` para mostrar
 * "Ação simulada no modo demo — Cadastro de aluno".
 *
 * Montado uma vez no dashboard layout quando demo está ativo.
 */

const EVENT_NAME = 'ph:demo-simulated'

/** Dispara o toast em qualquer componente client-side */
export function notifyDemoSimulated(acao?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: acao ?? '' }))
}

interface ToastItem { id: number; texto: string }

export function DemoToast() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<string>).detail || ''
      const id = Date.now() + Math.random()
      const base = 'Ação simulada no modo demo'
      const texto = detail ? `${base} — ${detail}` : base
      setItems(prev => [...prev, { id, texto }])
      // Auto-remove após 3s
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3000)
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  if (items.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <div
          key={item.id}
          className="animate-in fade-in slide-in-from-bottom-2"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: 380,
          }}
        >
          <Sparkles size={14} strokeWidth={1.75} style={{ color: 'var(--green-primary)' }} aria-hidden />
          <span>{item.texto}</span>
        </div>
      ))}
    </div>
  )
}
