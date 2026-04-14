'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/dashboard/alunos',
    label: 'Alunos',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/dashboard/agenda',
    label: 'Agenda',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/dashboard/financeiro',
    label: 'Financeiro',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    href: '/dashboard/relatorios',
    label: 'Relatórios',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  fotoUrl: string | null
  professorNome: string
  isAdmin?: boolean
}

export function Sidebar({ isOpen, onClose, fotoUrl, professorNome, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const firstName = professorNome.split(' ')[0] || professorNome
  const initials = professorNome.slice(0, 2).toUpperCase() || 'PH'

  const isConfiguracoes = pathname === '/dashboard/configuracoes'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={`
        fixed top-0 left-0 z-30 w-60 flex flex-col
        transition-transform duration-200 ease-in-out
        md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', height: '100dvh' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 h-14 px-5 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
          style={{ background: 'var(--green-primary)', color: '#000' }}
        >
          PH
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          PersonalHub
        </span>
      </div>

      {/* Scrollable content: nav + bottom section */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

      {/* Nav */}
      <nav className="p-3 flex flex-col gap-0.5">
        <p className="text-xs font-medium px-3 py-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100"
              style={
                isActive
                  ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.15)' }
                  : { color: 'var(--text-secondary)' }
              }
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-card)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Spacer so bottom section is pushed down naturally */}
      <div className="flex-1" />

      {/* Bottom section: profile card + configurações + sair */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>

        {/* Profile card */}
        <Link
          href="/dashboard/configuracoes"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors duration-100"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={firstName}
              className="w-8 h-8 rounded-full object-cover shrink-0"
              style={{ border: '1.5px solid var(--green-primary)' }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1.5px solid var(--green-primary)' }}
            >
              {initials}
            </div>
          )}
          <span className="text-sm font-medium flex-1 truncate">{firstName}</span>
        </Link>

        {/* Admin (only visible to admin user) */}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors duration-100"
            style={{ color: '#A78BFA' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-sm font-medium">Admin</span>
          </Link>
        )}

        {/* Configurações */}
        <Link
          href="/dashboard/configuracoes"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors duration-100"
          style={
            isConfiguracoes
              ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.15)' }
              : { color: 'var(--text-secondary)' }
          }
          onMouseEnter={e => { if (!isConfiguracoes) e.currentTarget.style.background = 'var(--bg-card)' }}
          onMouseLeave={e => { if (!isConfiguracoes) e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="text-sm font-medium">Configurações</span>
        </Link>

        {/* Sair */}
        <button
          onClick={() => { onClose(); handleLogout() }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100 cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = '#FF5252' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
      </div>{/* end scrollable content */}
    </aside>
  )
}
