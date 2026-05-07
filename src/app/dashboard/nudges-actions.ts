'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

/**
 * Marks a nudge as dismissed for the current professor. Idempotent — calling
 * twice for the same key is fine because of the unique constraint.
 */
export async function dismissNudgeAction(nudgeKey: string): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('nudges_dismissed')
    .upsert(
      { professor_id: user.id, nudge_key: nudgeKey },
      { onConflict: 'professor_id,nudge_key' },
    )

  if (error) {
    console.error('dismissNudge:', error)
    return { error: 'Não foi possível salvar a dispensa da dica.' }
  }

  revalidatePath('/dashboard', 'layout')
  return {}
}

/** Re-enables nudges by deleting all dismissals for the current professor. */
export async function resetNudgesAction(): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('nudges_dismissed')
    .delete()
    .eq('professor_id', user.id)

  if (error) {
    console.error('resetNudges:', error)
    return { error: 'Não foi possível reativar as dicas.' }
  }

  revalidatePath('/dashboard', 'layout')
  return {}
}

/** Toggles the global "show nudges" preference. */
export async function setNudgesEnabledAction(enabled: boolean): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('professor_perfil')
    .update({ nudges_enabled: enabled })
    .eq('professor_id', user.id)

  if (error) {
    console.error('setNudgesEnabled:', error)
    return { error: 'Não foi possível salvar a preferência.' }
  }

  revalidatePath('/dashboard', 'layout')
  return {}
}

/** Toggles "show numeric alert badges + banners" preference. */
export async function setMenuAlertsEnabledAction(enabled: boolean): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('professor_perfil')
    .update({ menu_alerts_enabled: enabled })
    .eq('professor_id', user.id)

  if (error) {
    console.error('setMenuAlertsEnabled:', error)
    return { error: 'Não foi possível salvar a preferência.' }
  }

  revalidatePath('/dashboard', 'layout')
  return {}
}
