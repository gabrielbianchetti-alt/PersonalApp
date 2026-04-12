import { createClient } from '@/lib/supabase/server'
import { themeStyle } from '@/lib/color'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

const ADMIN_EMAIL = 'gabrielbianchetti@hotmail.com'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch professor profile for theme + avatar (single lightweight query)
  const { data: perfil } = user
    ? await supabase
        .from('professor_perfil')
        .select('foto_url, nome, cor_tema')
        .eq('professor_id', user.id)
        .maybeSingle()
    : { data: null }

  const corTema: string = (perfil?.cor_tema as string | null) ?? '#00E676'
  const fotoUrl: string | null = (perfil?.foto_url as string | null) ?? null
  const professorNome: string =
    (perfil?.nome as string | null) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    'Professor'

  const isAdmin = user?.email === ADMIN_EMAIL

  // Only inject if different from the default (avoids empty style tag)
  const injectStyle = corTema !== '#00E676' ? themeStyle(corTema) : null

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
        isAdmin={isAdmin}
      >
        {children}
      </DashboardShell>
    </>
  )
}
