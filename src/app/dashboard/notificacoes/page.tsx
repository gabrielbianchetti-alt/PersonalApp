import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotificacoesPage } from './NotificacoesPage'
import { isDemoMode } from '@/lib/demo/mode'

export const metadata: Metadata = { title: 'Notificações — PersonalHub' }

export default async function NotificacoesPageRoute() {
  const demo = await isDemoMode()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !demo) return null
  return <NotificacoesPage />
}
