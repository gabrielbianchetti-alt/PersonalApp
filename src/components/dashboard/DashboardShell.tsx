'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { applyTheme, applyModo } from '@/lib/color'
import type { ModoTema } from '@/app/dashboard/configuracoes/types'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface Props {
  children: React.ReactNode
  fotoUrl: string | null
  professorNome: string
  corTema: string
  modoTema?: ModoTema
  isAdmin?: boolean
}

export function DashboardShell({ children, fotoUrl, professorNome, corTema, modoTema = 'escuro', isAdmin }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close sidebar on route change (handles mobile navigation correctly)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Re-apply theme on client after hydration.
  // The <style> tag in layout.tsx + the data-theme on <html> (via cookie in root layout)
  // already cover SSR (no flash). This effect keeps things correct after client-side
  // navigation and syncs the ph-modo cookie so future SSR renders are also correct
  // (e.g. on a new device where the cookie doesn't exist yet).
  useEffect(() => {
    if (corTema && corTema !== '#e0b066') applyTheme(corTema)
    applyModo(modoTema)
    // Sync cookie client-side so the root layout reads the correct value on next SSR
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `ph-modo=${modoTema};path=/;max-age=${maxAge};samesite=lax`
  }, [corTema, modoTema])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        fotoUrl={fotoUrl}
        professorNome={professorNome}
        isAdmin={isAdmin}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content area */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-60">
        {/* Desktop header */}
        <header
          className="hidden md:flex items-center justify-end h-14 px-6 shrink-0"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <NotificationBell variant="mobile" />
        </header>

        {/* Mobile header */}
        <header
          className="flex items-center gap-3 h-14 px-4 shrink-0 md:hidden"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg -ml-1 cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Abrir menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ background: 'var(--green-primary)', color: '#000' }}
          >
            PH
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            PersonalHub
          </span>
          <div className="ml-auto">
            <NotificationBell variant="mobile" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
