'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { AuthCard } from '@/components/ui/AuthCard'
import { loginAction } from './actions'
import { useGreeting } from '@/hooks/useGreeting'

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const greeting = useGreeting()

  return (
    <AuthCard>
      <div className="mb-6">
        <p className="text-sm mb-1" style={{ color: 'var(--green-primary)' }}>
          {greeting}
        </p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Entre na sua conta
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerencie seus alunos e treinos com facilidade
        </p>
      </div>

      {state?.error && <div className="mb-4"><Alert type="error" message={state.error} /></div>}

      <form action={formAction} className="flex flex-col gap-4">
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
          placeholder="••••••••"
          autoComplete="current-password"
          required
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          }
        />

        <div className="flex justify-end -mt-1">
          <Link
            href="/forgot-password"
            className="text-xs transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" loading={isPending} className="mt-1">
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Não tem uma conta?{' '}
        <Link
          href="/register"
          className="font-semibold transition-colors"
          style={{ color: 'var(--green-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--green-primary)')}
        >
          Cadastre-se grátis
        </Link>
      </p>
    </AuthCard>
  )
}
