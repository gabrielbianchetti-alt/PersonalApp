import type { Viewport } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants'
import { LockZoom } from '@/components/dashboard/LockZoom'

export { ADMIN_EMAILS }

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/dashboard')
  }

  return (
    <div
      className="min-h-screen ph-locked-zoom"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <LockZoom />
      {children}
    </div>
  )
}
