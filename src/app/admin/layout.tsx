import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const ADMIN_EMAIL = 'gabrielbianchetti@hotmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {children}
    </div>
  )
}
