'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AssinaturaData {
  status: string
  plano: string | null
  trial_fim: string | null
  periodo_fim: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

/**
 * Fetches the assinatura for the current professor.
 * If none exists yet, creates a 7-day trial record.
 */
export async function getOrCreateAssinaturaAction(): Promise<{
  data: AssinaturaData | null
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: null, error: 'Sessão expirada.' }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY not set on this environment — skip subscription check
    return { data: null, error: 'Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY).' }
  }

  // Try to fetch existing record
  const { data: existing } = await admin
    .from('assinaturas')
    .select('status, plano, trial_fim, periodo_fim, stripe_customer_id, stripe_subscription_id')
    .eq('professor_id', user.id)
    .maybeSingle()

  if (existing) return { data: existing as AssinaturaData }

  // Create trial record
  const trialFim = new Date()
  trialFim.setDate(trialFim.getDate() + 7)

  const { data: novo, error: insertError } = await admin
    .from('assinaturas')
    .insert({
      professor_id: user.id,
      status: 'trial',
      trial_fim: trialFim.toISOString(),
    })
    .select('status, plano, trial_fim, periodo_fim, stripe_customer_id, stripe_subscription_id')
    .single()

  if (insertError) {
    console.error('getOrCreateAssinatura insert:', insertError)
    return { data: null, error: 'Erro ao iniciar período de teste.' }
  }

  return { data: novo as AssinaturaData }
}
