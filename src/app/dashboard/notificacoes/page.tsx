import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotificacoesPage } from './NotificacoesPage'

export const metadata: Metadata = { title: 'Notificações — PersonalHub' }

export default async function NotificacoesPageRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return <NotificacoesPage />
}
