'use client'

import Link from 'next/link'
import { AuthCard } from '@/components/ui/AuthCard'

export function SuccessContent() {
  return (
    <AuthCard>
      <div className="flex flex-col items-center text-center gap-6 py-4">
        {/* Animated checkmark */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'var(--green-muted)', border: '2px solid rgba(224, 176, 102,0.2)' }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--green-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: 'var(--green-primary)' }}
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Conta criada com sucesso!
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Enviamos um e-mail de confirmação para você.
            <br />
            Verifique sua caixa de entrada para ativar sua conta.
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Não esqueça de checar a pasta de spam.
          </p>
        </div>

        <div className="w-full h-px" style={{ background: 'var(--border-subtle)' }} />

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/login"
            className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center transition-all duration-150"
            style={{ background: 'var(--green-primary)', color: '#000' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green-primary)')}
          >
            Ir para o login
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}
