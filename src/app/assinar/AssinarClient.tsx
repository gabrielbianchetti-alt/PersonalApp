'use client'

import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import type { Plano } from '@/lib/stripe'

interface Props {
  alunosCount: number
  aulasCount: number
}

const PLANOS = [
  {
    id: 'mensal' as Plano,
    label: 'Mensal',
    preco: 'R$29,90',
    periodo: '/mês',
    detalhe: 'Cobrado mensalmente',
    destaque: false,
  },
  {
    id: 'anual' as Plano,
    label: 'Anual',
    preco: 'R$249,90',
    periodo: '/ano',
    detalhe: 'Equivale a R$20,82/mês — 30% de economia',
    destaque: true,
  },
]

export function AssinarClient({ alunosCount, aulasCount }: Props) {
  const [loading, setLoading] = useState<Plano | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAssinar(plano: Plano) {
    setError(null)
    setLoading(plano)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Erro ao iniciar checkout.')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor.')
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16,
            background: 'rgba(16, 185, 129,0.08)', border: '1px solid rgba(16, 185, 129,0.2)',
            borderRadius: 24, padding: '5px 16px', fontSize: 12, fontWeight: 700, color: '#10B981',
          }}
        >
          🔒 Acesso ao PersonalHub
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 12, lineHeight: 1.2 }}>
          Continue usando o PersonalHub
        </h1>
        <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.6 }}>
          Seu período de teste terminou. Escolha um plano para manter o acesso à sua conta.
        </p>
      </div>

      {/* What the user built */}
      {(alunosCount > 0 || aulasCount > 0) && (
        <div
          style={{
            background: 'rgba(16, 185, 129,0.06)', border: '1px solid rgba(16, 185, 129,0.15)',
            borderRadius: 16, padding: '16px 20px', marginBottom: 32,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}
        >
          <BarChart3 size={24} strokeWidth={1.75} aria-hidden />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              Você já construiu no PersonalHub:
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              {alunosCount > 0 && `${alunosCount} aluno${alunosCount > 1 ? 's' : ''} cadastrado${alunosCount > 1 ? 's' : ''}`}
              {alunosCount > 0 && aulasCount > 0 && ' · '}
              {aulasCount > 0 && `${aulasCount} aula${aulasCount > 1 ? 's' : ''} na agenda`}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            Seus dados estão seguros
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {PLANOS.map(p => (
          <div
            key={p.id}
            style={{
              background: p.destaque ? '#0f172a' : '#1e293b',
              border: `1.5px solid ${p.destaque ? '#10B981' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 20,
              padding: '28px 24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {p.destaque && (
              <div
                style={{
                  position: 'absolute', top: 14, right: 14,
                  background: '#10B981', color: '#000',
                  borderRadius: 20, padding: '3px 12px',
                  fontSize: 10, fontWeight: 800,
                }}
              >
                RECOMENDADO
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
              {p.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                {p.preco}
              </span>
              <span style={{ fontSize: 13, color: '#64748b', paddingBottom: 4 }}>{p.periodo}</span>
            </div>
            <p style={{ fontSize: 11, color: p.destaque ? '#10B981' : '#64748b', marginBottom: 20 }}>
              {p.detalhe}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Alunos ilimitados',
                'Agenda completa',
                'Cobrança via WhatsApp',
                'Termos de compromisso',
                'Cálculo automático',
                'Suporte por WhatsApp',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1' }}>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: 12 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleAssinar(p.id)}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                background: p.destaque ? '#10B981' : 'rgba(255,255,255,0.08)',
                color: p.destaque ? '#000' : '#f8fafc',
                fontWeight: 700, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== p.id ? 0.5 : 1,
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {loading === p.id ? 'Redirecionando...' : 'Assinar agora'}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68,0.08)', border: '1px solid rgba(239, 68, 68,0.25)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
            fontSize: 13, color: '#EF4444', textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
          Sem taxa de cancelamento · Cancele quando quiser · Pagamento seguro via Stripe
        </p>
        <a
          href="https://api.whatsapp.com/send?phone=5511999999999&text=Oi,%20preciso%20de%20ajuda%20com%20o%20PersonalHub"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}
        >
          💬 Falar com suporte via WhatsApp
        </a>
      </div>
    </div>
  )
}
