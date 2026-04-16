'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { ADMIN_EMAILS } from './layout'

async function guardAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) redirect('/dashboard')
  return user
}

export async function toggleBlockAction(
  targetId: string,
  currentlyBlocked: boolean,
): Promise<{ error?: string }> {
  await guardAdmin()
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada neste ambiente.' }
  }

  const { error } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: currentlyBlocked ? 'none' : '876600h',
  })

  if (error) {
    console.error('toggleBlock:', error)
    return { error: error.message }
  }
  return {}
}

export async function cancelarAssinaturaAdminAction(
  professorId: string,
  stripeSubscriptionId: string | null,
): Promise<{ error?: string }> {
  await guardAdmin()

  // Cancel in Stripe if subscription ID exists
  if (stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(stripeSubscriptionId)
    } catch (err) {
      console.error('cancelarStripe:', err)
      // Continue to update DB even if Stripe call fails
    }
  }

  // Update assinaturas table
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }
  }

  const { error } = await admin
    .from('assinaturas')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('professor_id', professorId)

  if (error) {
    console.error('cancelarAssinaturaAdmin:', error)
    return { error: `Erro ao cancelar: ${error.message}` }
  }

  return {}
}
