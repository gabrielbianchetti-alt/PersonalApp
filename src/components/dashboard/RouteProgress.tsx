'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Barra de progresso fina no topo durante a navegação entre rotas.
 * - Liga ao detectar click em <a> interno cujo href difere do pathname atual.
 * - Avança automaticamente em direção a 80% enquanto a navegação está
 *   pendente (estilo NProgress) e dispara para 100% no momento em que o
 *   pathname muda.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState<number | null>(null)
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inicia em click em link interno
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignora cliques modificados (ctrl/meta/shift/middle) — abrem em nova aba
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      const target = e.target as HTMLElement | null
      const a = target?.closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('/') || href.startsWith('//')) return
      if (a.target && a.target !== '_self') return
      // Mesmo path → não navega
      const url = new URL(href, location.origin)
      if (url.pathname === pathname) return
      setProgress(p => (p === null ? 8 : p))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  // Tick: avança em direção a 80%
  useEffect(() => {
    if (progress === null) return
    if (progress >= 80) return
    tickRef.current = setTimeout(() => {
      setProgress(p => {
        if (p === null) return null
        if (p >= 80) return p
        return p + (80 - p) * 0.12
      })
    }, 120)
    return () => { if (tickRef.current) clearTimeout(tickRef.current) }
  }, [progress])

  // Pathname mudou → finaliza
  const finalizingRef = useRef(false)
  useEffect(() => {
    if (progress === null || finalizingRef.current) return
    finalizingRef.current = true
    setProgress(100)
    const t = setTimeout(() => {
      setProgress(null)
      finalizingRef.current = false
    }, 220)
    return () => clearTimeout(t)
    // intencional: só queremos reagir a mudanças do pathname,
    // não ao próprio progress (causaria loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (progress === null) return null

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
      style={{ height: 3 }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--green-primary)',
          transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms',
          opacity: progress >= 100 ? 0 : 1,
          boxShadow: '0 0 8px var(--green-primary), 0 0 4px var(--green-primary)',
        }}
      />
    </div>
  )
}
