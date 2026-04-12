'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { applyTheme } from '@/lib/color'

interface Props {
  children: React.ReactNode
  fotoUrl: string | null
  professorNome: string
  corTema: string
}

export function DashboardShell({ children, fotoUrl, professorNome, corTema }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Re-apply theme on client after hydration (handles non-default colors;
  // the <style> tag in layout.tsx already covers SSR so there's no flash)
  useEffect(() => {
    if (corTema && corTema !== '#00E676') applyTheme(corTema)
  }, [corTema])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        fotoUrl={fotoUrl}
        professorNome={professorNome}
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
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
