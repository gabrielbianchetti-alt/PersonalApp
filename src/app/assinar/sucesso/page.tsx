import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Assinatura ativada — PersonalHub' }

export default function AssinarSucessoPage() {
  return (
    <div
      style={{
        maxWidth: 480, margin: '0 auto', padding: '80px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(0,230,118,0.12)', border: '2px solid #00E676',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 24,
        }}
      >
        🎉
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 12 }}>
        Assinatura ativada!
      </h1>
      <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32, maxWidth: 360 }}>
        Seu acesso ao PersonalHub foi ativado com sucesso. Bem-vindo ao plano Pro — agora você pode usar todas as funcionalidades sem limitação.
      </p>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#00E676', color: '#000',
          fontWeight: 700, fontSize: 15, padding: '13px 28px',
          borderRadius: 12, textDecoration: 'none',
        }}
      >
        Ir para o Dashboard →
      </Link>
    </div>
  )
}
