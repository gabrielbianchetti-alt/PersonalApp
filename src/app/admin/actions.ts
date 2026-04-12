'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAIL } from './layout'

async function guardAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard')
  return user
}

export async function toggleBlockAction(
  targetId: string,
  currentlyBlocked: boolean,
): Promise<{ error?: string }> {
  await guardAdmin()
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: currentlyBlocked ? 'none' : '876600h', // 'none' = unban; very long = ban
  })

  if (error) {
    console.error('toggleBlock:', error)
    return { error: error.message }
  }
  return {}
}
