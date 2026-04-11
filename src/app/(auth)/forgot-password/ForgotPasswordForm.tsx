'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { AuthCard } from '@/components/ui/AuthCard'
import { forgotPasswordAction } from './actions'

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null)

  if (state?.success) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--green-muted)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              E-mail enviado!
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Não esqueça de checar a pasta de spam.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold mt-2 transition-colors"
            style={{ color: 'var(--green-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--green-primary)')}
          >
            Voltar ao login
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'var(--green-muted)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Recuperar senha
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Enviaremos um link de recuperação para o seu e-mail
        </p>
      </div>

      {state?.error && <div className="mb-4"><Alert type="error" message={state.error} /></div>}

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="E-mail cadastrado"
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

        <Button type="submit" loading={isPending} className="mt-1">
          Enviar link de recuperação
        </Button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Lembrou a senha?{' '}
        <Link
          href="/login"
          className="font-semibold transition-colors"
          style={{ color: 'var(--green-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--green-primary)')}
        >
          Voltar ao login
        </Link>
      </p>
    </AuthCard>
  )
}
