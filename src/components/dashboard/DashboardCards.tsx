'use client'

import Link from 'next/link'

export function DashboardCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Link
        href="/dashboard/alunos"
        className="p-5 rounded-2xl flex flex-col gap-3 transition-all duration-150"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(224, 176, 102,0.3)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--green-muted)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Alunos</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Gerenciar alunos cadastrados</p>
        </div>
      </Link>

      {['Agenda', 'Cobrança'].map((label) => (
        <div
          key={label}
          className="p-5 rounded-2xl flex flex-col gap-3 opacity-40 cursor-not-allowed"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--bg-input)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Em breve</p>
          </div>
        </div>
      ))}
    </div>
  )
}
