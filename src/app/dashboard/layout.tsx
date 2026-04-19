import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { themeStyle } from '@/lib/color'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { TrialBanner } from '@/components/dashboard/TrialBanner'
import { DemoBanner } from '@/components/dashboard/DemoBanner'
import { DemoToast } from '@/components/dashboard/DemoToast'
import { DemoTour } from '@/components/dashboard/DemoTour'
import { getOrCreateAssinaturaAction } from '@/app/dashboard/configuracoes/assinatura-actions'
import type { ModoTema } from '@/app/dashboard/configuracoes/types'
import { ADMIN_EMAILS } from '@/lib/constants'
import { isDemoMode } from '@/lib/demo/mode'
import { DEMO_PROFESSOR_NOME, getDemoPerfil } from '@/lib/demo/fixtures'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemoMode()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use admin client to bypass RLS — scoped to user.id so it's safe
  let db = supabase as Awaited<ReturnType<typeof createClient>>
  try { db = createAdminClient() as unknown as typeof db } catch { /* fallback to user-scoped client */ }

  // Fetch professor profile for theme + avatar (pula em demo mode)
  const { data: perfil } = !demo && user
    ? await db
        .from('professor_perfil')
        .select('foto_url, nome, cor_tema, modo_tema')
        .eq('professor_id', user.id)
        .maybeSingle()
    : { data: demo ? getDemoPerfil() : null }

  const corTema: string   = (perfil?.cor_tema  as string | null) ?? '#10B981'
  const modoTema: ModoTema = ((perfil?.modo_tema as string | null) ?? 'escuro') as ModoTema
  const fotoUrl: string | null = (perfil?.foto_url as string | null) ?? null
  const professorNome: string = demo
    ? DEMO_PROFESSOR_NOME
    : (
      (perfil?.nome as string | null) ??
      (user?.user_metadata?.full_name as string | undefined) ??
      'Professor'
    )

  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '')

  // Get (or create) assinatura — auto-starts 7-day trial on first login
  let assinatura = null
  if (user) {
    try {
      const result = await getOrCreateAssinaturaAction()
      assinatura = result.data ?? null
    } catch {
      // Non-fatal: dashboard still loads, banner just won't show
    }
  }

  const injectStyle = themeStyle(corTema)

  return (
    <>
      {injectStyle && (
        // eslint-disable-next-line react/no-danger
        <style dangerouslySetInnerHTML={{ __html: injectStyle }} />
      )}
      <DashboardShell
        fotoUrl={fotoUrl}
        professorNome={professorNome}
        corTema={corTema}
        modoTema={modoTema}
        isAdmin={isAdmin}
      >
        {demo && <DemoBanner />}
        {!demo && assinatura && !isAdmin && <TrialBanner assinatura={assinatura} isAdmin={isAdmin} />}
        {children}
        {demo && (
          <>
            <DemoToast />
            <DemoTour />
          </>
        )}
      </DashboardShell>
    </>
  )
}
