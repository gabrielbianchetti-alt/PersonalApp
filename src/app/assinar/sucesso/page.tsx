import Link from 'next/link'
import type { Metadata } from 'next'
import type Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

export const metadata: Metadata = { title: 'Assinatura ativada — PersonalHub' }

/** In Stripe v22+, current_period lives on SubscriptionItem, not Subscription */
function getSubscriptionPeriod(sub: Stripe.Subscription): { start: Date; end: Date } | null {
  const item = sub.items?.data?.[0]
  if (!item) return null
  return {
    start: new Date(item.current_period_start * 1000),
    end:   new Date(item.current_period_end   * 1000),
  }
}

export default async function AssinarSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  let activated = false

  if (session_id) {
    try {
      // 1. Verify with Stripe that the session is truly paid
      const session = await getStripe().checkout.sessions.retrieve(session_id, {
        expand: ['subscription', 'subscription.items'],
      })

      if (session.status === 'complete' && session.payment_status === 'paid') {
        // 2. Get authenticated user
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const subscription = session.subscription as Stripe.Subscription | null
          const period      = subscription ? getSubscriptionPeriod(subscription) : null
          const plano       = (session.metadata?.plano as string | undefined) ?? null

          // 3. Upsert assinaturas — fallback in case webhook hasn't fired yet
          try {
            const admin = createAdminClient()
            const { error } = await admin
              .from('assinaturas')
              .upsert({
                professor_id:           user.id,
                stripe_customer_id:     session.customer as string,
                stripe_subscription_id: subscription?.id ?? null,
                status:                 'active',
                plano,
                periodo_inicio: period?.start.toISOString() ?? null,
                periodo_fim:    period?.end.toISOString()   ?? null,
                updated_at:     new Date().toISOString(),
              }, { onConflict: 'professor_id' })

            if (!error) activated = true
            else console.error('sucesso: upsert error', error)
          } catch (adminErr) {
            // SUPABASE_SERVICE_ROLE_KEY missing — webhook should handle DB update
            console.error('sucesso: admin client error', adminErr)
            activated = true // payment is confirmed even if we can't write yet
          }
        }
      }
    } catch (err) {
      // STRIPE_SECRET_KEY missing or invalid session — show generic success
      console.error('sucesso: stripe verification error', err)
      activated = true // don't block the user; webhook handles the DB update
    }
  } else {
    // Direct navigation without session_id — show generic success
    activated = true
  }

  return (
    <div
      style={{
        maxWidth: 480, margin: '0 auto', padding: '80px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(16, 185, 129,0.12)', border: '2px solid #10B981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 28,
        }}
      >
        🎉
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 12 }}>
        {activated ? 'Assinatura ativada!' : 'Pagamento recebido!'}
      </h1>

      <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, marginBottom: 36, maxWidth: 360 }}>
        {activated
          ? 'Seu acesso ao PersonalHub foi ativado com sucesso. Bem-vindo ao plano Pro — agora você pode usar todas as funcionalidades sem limitação.'
          : 'Seu pagamento foi confirmado. A ativação pode levar alguns instantes. Se o acesso não aparecer em breve, entre em contato com o suporte.'}
      </p>

      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#10B981', color: '#000',
          fontWeight: 700, fontSize: 15, padding: '14px 32px',
          borderRadius: 12, textDecoration: 'none',
        }}
      >
        Ir para o Dashboard →
      </Link>

      <p style={{ marginTop: 20, fontSize: 13, color: '#64748b' }}>
        Gerencie sua assinatura em{' '}
        <Link href="/dashboard/configuracoes" style={{ color: '#10B981', textDecoration: 'none' }}>
          Configurações
        </Link>
      </p>
    </div>
  )
}
