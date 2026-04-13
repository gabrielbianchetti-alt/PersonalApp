import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: assinatura } = await admin
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('professor_id', user.id)
      .maybeSingle()

    if (!assinatura?.stripe_customer_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada.' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: assinatura.stripe_customer_id,
      return_url: `${appUrl}/dashboard/configuracoes`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('portal error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
