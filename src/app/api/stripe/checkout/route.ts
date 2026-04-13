import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, PRICE_IDS, type Plano } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { plano } = (await req.json()) as { plano: Plano }
    if (!plano || !PRICE_IDS[plano]) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: assinatura } = await admin
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('professor_id', user.id)
      .maybeSingle()

    // Find or create Stripe customer
    let customerId: string | undefined = assinatura?.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email!,
        metadata: { professor_id: user.id },
      })
      customerId = customer.id
      // Persist the customer ID
      await admin
        .from('assinaturas')
        .upsert({
          professor_id: user.id,
          stripe_customer_id: customerId,
          status: 'trial',
        }, { onConflict: 'professor_id' })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[plano], quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/assinar`,
      locale: 'pt-BR',
      allow_promotion_codes: true,
      metadata: {
        professor_id: user.id,
        plano,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('checkout error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
