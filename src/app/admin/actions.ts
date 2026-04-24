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

/**
 * Estende o trial de um professor em N dias a partir de HOJE.
 * Aplica-se apenas a assinaturas não-ativas (trial, expirado, canceled).
 * Não mexe em assinantes Stripe ativos.
 * Log da ação vai pro server log (Vercel/console).
 */
export async function estenderTrialAction(
  professorId: string,
  dias: number,
): Promise<{ error?: string; newTrialFim?: string }> {
  const adminUser = await guardAdmin()

  if (!Number.isFinite(dias) || dias <= 0 || dias > 365) {
    return { error: 'Quantidade de dias inválida (use 1–365).' }
  }

  let admin
  try { admin = createAdminClient() }
  catch { return { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' } }

  // Busca a assinatura atual
  const { data: ass, error: getErr } = await admin
    .from('assinaturas')
    .select('id, professor_id, status, trial_fim, stripe_subscription_id')
    .eq('professor_id', professorId)
    .maybeSingle()

  if (getErr) return { error: getErr.message }

  // Não permite estender assinantes ativos do Stripe
  if (ass?.status === 'active' && ass?.stripe_subscription_id) {
    return { error: 'Professor é assinante ativo. Não é possível estender trial.' }
  }

  // Novo trial_fim = HOJE + N dias (não soma sobre o anterior)
  const novo = new Date()
  novo.setDate(novo.getDate() + dias)
  novo.setHours(23, 59, 59, 999)
  const novoIso = novo.toISOString()
  const anteriorIso = ass?.trial_fim ?? null

  // Se não existir assinatura, cria uma em trial. Caso contrário, atualiza.
  if (!ass) {
    const { error: insErr } = await admin.from('assinaturas').insert({
      professor_id: professorId,
      status:       'trial',
      plano:        null,
      trial_fim:    novoIso,
    })
    if (insErr) return { error: insErr.message }
  } else {
    const { error: upErr } = await admin
      .from('assinaturas')
      .update({
        status:     'trial',
        trial_fim:  novoIso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ass.id)
    if (upErr) return { error: upErr.message }
  }

  // Log estruturado — aparece no server log
  console.log('[admin] trial estendido', JSON.stringify({
    admin_email: adminUser.email,
    admin_id:    adminUser.id,
    professor_id: professorId,
    dias_adicionados: dias,
    trial_fim_anterior: anteriorIso,
    trial_fim_novo:     novoIso,
    at: new Date().toISOString(),
  }))

  return { newTrialFim: novoIso }
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
