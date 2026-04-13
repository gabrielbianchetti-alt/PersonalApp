import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

/** In Stripe v22+ (dahlia), current_period lives on SubscriptionItem, not Subscription */
function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: Date; end: Date } | null {
  const item = subscription.items?.data?.[0]
  if (!item) return null
  return {
    start: new Date(item.current_period_start * 1000),
    end:   new Date(item.current_period_end   * 1000),
  }
}

/** In Stripe v22+, Invoice.subscription is in invoice.parent.subscription_details.subscription */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details
  if (!details) return null
  const sub = details.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      // ── Checkout completed → activate subscription ─────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const professorId = session.metadata?.professor_id
        const plano = session.metadata?.plano as 'mensal' | 'anual' | undefined
        if (!professorId) break

        const subscriptionId = session.subscription as string
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
          expand: ['items'],
        })

        const period = getSubscriptionPeriod(subscription)

        await admin.from('assinaturas').upsert({
          professor_id: professorId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          plano: plano ?? null,
          periodo_inicio: period?.start.toISOString() ?? null,
          periodo_fim:    period?.end.toISOString()   ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'professor_id' })
        break
      }

      // ── Invoice paid → renew period ────────────────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (!subscriptionId) break

        const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
          expand: ['items'],
        })
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        const period = getSubscriptionPeriod(subscription)

        await admin
          .from('assinaturas')
          .update({
            status: 'active',
            periodo_inicio: period?.start.toISOString() ?? null,
            periodo_fim:    period?.end.toISOString()   ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      // ── Payment failed → past_due ──────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id
        if (!customerId) break

        await admin
          .from('assinaturas')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        break
      }

      // ── Subscription deleted/expired ───────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        await admin
          .from('assinaturas')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        break
      }

      // ── Subscription updated (cancel_at_period_end, etc.) ──────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        const period = getSubscriptionPeriod(subscription)
        const newStatus = subscription.cancel_at_period_end ? 'canceled' : 'active'

        await admin
          .from('assinaturas')
          .update({
            status: newStatus,
            periodo_fim: period?.end.toISOString() ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
