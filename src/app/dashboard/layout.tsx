import type { Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { themeStyle } from '@/lib/color'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { TrialBanner } from '@/components/dashboard/TrialBanner'
import { DemoBanner } from '@/components/dashboard/DemoBanner'
import { DemoToast } from '@/components/dashboard/DemoToast'
import { DemoTour } from '@/components/dashboard/DemoTour'
import { LockZoom } from '@/components/dashboard/LockZoom'
import { getOrCreateAssinaturaAction } from '@/app/dashboard/configuracoes/assinatura-actions'
import type { ModoTema } from '@/app/dashboard/configuracoes/types'
import { ADMIN_EMAILS } from '@/lib/constants'
import { isDemoMode } from '@/lib/demo/mode'
import { DEMO_PROFESSOR_NOME, getDemoPerfil } from '@/lib/demo/fixtures'
import { getUserState } from '@/lib/user-state'

// Bloqueia zoom no app autenticado (comportamento de app nativo)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

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

  // Sidebar badges — count + label por item. Subtítulo + tooltip aparecem
  // automaticamente quando count > 0. Toggle global em Configurações.
  // getUserState é cached() pelo render tree, então a página subjacente
  // reaproveita a mesma resposta (zero round-trips extras).
  const userStateForBadges = !demo && user ? await getUserState().catch(() => null) : null
  const showAlerts = userStateForBadges?.menuAlertsEnabled !== false
  const sidebarBadges = userStateForBadges && showAlerts
    ? {
        alunos: userStateForBadges.aprovacoesPendentesCount > 0
          ? {
              count: userStateForBadges.aprovacoesPendentesCount,
              label: userStateForBadges.aprovacoesPendentesCount === 1
                ? '1 aguardando aprovação'
                : `${userStateForBadges.aprovacoesPendentesCount} aguardando aprovação`,
            }
          : undefined,
        agenda: userStateForBadges.reposicoesUrgentesCount > 0
          ? {
              count: userStateForBadges.reposicoesUrgentesCount,
              label: userStateForBadges.reposicoesUrgentesCount === 1
                ? '1 reposição vencendo'
                : `${userStateForBadges.reposicoesUrgentesCount} reposições vencendo`,
            }
          : undefined,
        financeiro: userStateForBadges.cobrancasVencidasCount > 0
          ? {
              count: userStateForBadges.cobrancasVencidasCount,
              label: userStateForBadges.cobrancasVencidasCount === 1
                ? '1 cobrança vencida'
                : `${userStateForBadges.cobrancasVencidasCount} cobranças vencidas`,
            }
          : undefined,
      }
    : undefined

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
    <div className="ph-locked-zoom">
      <LockZoom />
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
        badges={sidebarBadges}
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
    </div>
  )
}
