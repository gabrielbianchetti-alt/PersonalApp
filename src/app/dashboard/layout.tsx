import { createClient } from '@/lib/supabase/server'
import { themeStyle } from '@/lib/color'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { TrialBanner } from '@/components/dashboard/TrialBanner'
import { getOrCreateAssinaturaAction } from '@/app/dashboard/configuracoes/assinatura-actions'
import type { ModoTema } from '@/app/dashboard/configuracoes/types'

const ADMIN_EMAIL = 'gabrielbianchetti@hotmail.com'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch professor profile for theme + avatar
  const { data: perfil } = user
    ? await supabase
        .from('professor_perfil')
        .select('foto_url, nome, cor_tema, modo_tema')
        .eq('professor_id', user.id)
        .maybeSingle()
    : { data: null }

  const corTema: string   = (perfil?.cor_tema  as string | null) ?? '#00E676'
  const modoTema: ModoTema = ((perfil?.modo_tema as string | null) ?? 'escuro') as ModoTema
  const fotoUrl: string | null = (perfil?.foto_url as string | null) ?? null
  const professorNome: string =
    (perfil?.nome as string | null) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    'Professor'

  const isAdmin = user?.email === ADMIN_EMAIL

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
        {assinatura && !isAdmin && <TrialBanner assinatura={assinatura} isAdmin={isAdmin} />}
        {children}
      </DashboardShell>
    </>
  )
}
