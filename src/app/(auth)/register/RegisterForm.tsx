'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { AuthCard } from '@/components/ui/AuthCard'
import { registerAction } from './actions'

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null)

  return (
    <AuthCard>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Crie sua conta
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Comece a gerenciar seus alunos hoje mesmo
        </p>
      </div>

      {state?.error && <div className="mb-4"><Alert type="error" message={state.error} /></div>}

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="name"
          name="name"
          type="text"
          label="Nome completo"
          placeholder="João Silva"
          autoComplete="name"
          required
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          }
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          required
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          }
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Senha"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          required
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          }
        />
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirmar senha"
          placeholder="Repita a senha"
          autoComplete="new-password"
          required
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          }
        />

        <Button type="submit" loading={isPending} className="mt-1">
          Criar conta gratuita
        </Button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Já tem uma conta?{' '}
        <Link
          href="/login"
          className="font-semibold transition-colors"
          style={{ color: 'var(--green-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--green-primary)')}
        >
          Entrar
        </Link>
      </p>
    </AuthCard>
  )
}
