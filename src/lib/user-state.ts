import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Snapshot of "where the user is" in their PersonalHub journey, used by
 * Progressive Disclosure to decide which sections / tabs / nudges to render.
 *
 * Computed server-side. `cache()` dedupes calls within a single render tree
 * so multiple components in the same request share one round-trip.
 *
 * IMPORTANT: keep this lightweight — one cheap query per dimension. Heavier
 * dashboards already fetch their own data and shouldn't re-derive via this.
 */
export interface UserState {
  hasStudents:                boolean
  studentsCount:              number
  hasActivePackages:          boolean
  hasCustos:                  boolean
  hasMonthHistory:            boolean   // 2+ months of cobranças
  monthsActive:               number    // months since first aluno
  hasAprovacoesPendentes:     boolean
  hasCobrancasPendentes:      boolean
  nudgesEnabled:              boolean
  dismissedNudges:            ReadonlySet<string>
}

const EMPTY: UserState = {
  hasStudents:            false,
  studentsCount:          0,
  hasActivePackages:      false,
  hasCustos:              false,
  hasMonthHistory:        false,
  monthsActive:           0,
  hasAprovacoesPendentes: false,
  hasCobrancasPendentes:  false,
  nudgesEnabled:          true,
  dismissedNudges:        new Set(),
}

export const getUserState = cache(async (): Promise<UserState> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return EMPTY

  const today = new Date()
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Run independent queries in parallel; each one is a HEAD count or a tiny
  // select. Total work is well under a normal page render.
  const [
    alunosCount,
    pacoteAlunoCount,
    custosCount,
    cobrancasMesesRes,
    primeiroAlunoRes,
    aprovacoesCount,
    cobrancasPendentesCount,
    perfilRes,
    dismissedRes,
  ] = await Promise.all([
    supabase.from('alunos')
      .select('id', { head: true, count: 'exact' })
      .eq('professor_id', user.id)
      .eq('status', 'ativo'),
    supabase.from('alunos')
      .select('id', { head: true, count: 'exact' })
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .eq('modelo_cobranca', 'pacote'),
    supabase.from('custos')
      .select('id', { head: true, count: 'exact' })
      .eq('professor_id', user.id)
      .or('ativo.is.null,ativo.eq.true'),
    supabase.from('cobrancas')
      .select('mes_referencia')
      .eq('professor_id', user.id),
    supabase.from('alunos')
      .select('created_at')
      .eq('professor_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('convites_aluno')
      .select('id', { head: true, count: 'exact' })
      .eq('professor_id', user.id)
      .eq('status', 'aguardando_aprovacao'),
    supabase.from('cobrancas')
      .select('id', { head: true, count: 'exact' })
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesAtual)
      .eq('status', 'pendente'),
    supabase.from('professor_perfil')
      .select('nudges_enabled')
      .eq('professor_id', user.id)
      .maybeSingle(),
    supabase.from('nudges_dismissed')
      .select('nudge_key')
      .eq('professor_id', user.id),
  ])

  const studentsCount    = alunosCount.count ?? 0
  const mesesUnicos      = new Set((cobrancasMesesRes.data ?? []).map(r => r.mes_referencia as string))
  const primeiroIso      = (primeiroAlunoRes.data as { created_at: string } | null)?.created_at ?? null
  const monthsActive     = primeiroIso ? monthDiff(primeiroIso, today) : 0
  // nudges_enabled defaults to true if column not present yet (pre-migration)
  const nudgesEnabledRaw = (perfilRes.data as { nudges_enabled?: boolean } | null)?.nudges_enabled
  const dismissedKeys    = new Set((dismissedRes.data ?? []).map(r => r.nudge_key as string))

  return {
    hasStudents:            studentsCount > 0,
    studentsCount,
    hasActivePackages:      (pacoteAlunoCount.count ?? 0) > 0,
    hasCustos:              (custosCount.count ?? 0) > 0,
    hasMonthHistory:        mesesUnicos.size >= 2,
    monthsActive,
    hasAprovacoesPendentes: (aprovacoesCount.count ?? 0) > 0,
    hasCobrancasPendentes:  (cobrancasPendentesCount.count ?? 0) > 0,
    nudgesEnabled:          nudgesEnabledRaw !== false,
    dismissedNudges:        dismissedKeys,
  }
})

function monthDiff(isoStart: string, end: Date): number {
  const start = new Date(isoStart)
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}
