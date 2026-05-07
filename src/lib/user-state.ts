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
  /** Convites com status='aguardando_aprovacao' */
  aprovacoesPendentesCount:   number
  /** Cobranças pendentes cuja data de cobrança já passou. */
  cobrancasVencidasCount:     number
  /** Faltas com status='pendente' vencendo nos próximos 7 dias. */
  reposicoesUrgentesCount:    number
  // Conveniência — computado das contagens.
  hasAprovacoesPendentes:     boolean
  hasCobrancasPendentes:      boolean
  hasReposicoesUrgentes:      boolean
  nudgesEnabled:              boolean
  /** Toggle de mostrar badges/banners de alerta (Configurações). */
  menuAlertsEnabled:          boolean
  dismissedNudges:            ReadonlySet<string>
}

const EMPTY: UserState = {
  hasStudents:              false,
  studentsCount:            0,
  hasActivePackages:        false,
  hasCustos:                false,
  hasMonthHistory:          false,
  monthsActive:             0,
  aprovacoesPendentesCount: 0,
  cobrancasVencidasCount:   0,
  reposicoesUrgentesCount:  0,
  hasAprovacoesPendentes:   false,
  hasCobrancasPendentes:    false,
  hasReposicoesUrgentes:    false,
  nudgesEnabled:            true,
  menuAlertsEnabled:        true,
  dismissedNudges:          new Set(),
}

export const getUserState = cache(async (): Promise<UserState> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return EMPTY

  const today      = new Date()
  const todayDay   = today.getDate()
  const todayIso   = today.toISOString().slice(0, 10)
  const next7Iso   = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10)
  const mesAtual   = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Run independent queries in parallel; each one is a HEAD count or a tiny
  // select. Total work is well under a normal page render.
  const [
    alunosCount,
    pacoteAlunoCount,
    custosCount,
    cobrancasMesesRes,
    primeiroAlunoRes,
    aprovacoesCount,
    cobrancasPendentesData,
    reposicoesUrgentesCount,
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
    // Cobrancas pendentes — vamos filtrar "vencidas" em JS pq dia_cobranca
    // mora em alunos. Limita a meses passados + atual pra não trazer futuro.
    supabase.from('cobrancas')
      .select('id, mes_referencia, alunos!inner(dia_cobranca)')
      .eq('professor_id', user.id)
      .eq('status', 'pendente')
      .lte('mes_referencia', mesAtual),
    supabase.from('faltas')
      .select('id', { head: true, count: 'exact' })
      .eq('professor_id', user.id)
      .eq('status', 'pendente')
      .gte('prazo_vencimento', todayIso)
      .lte('prazo_vencimento', next7Iso),
    supabase.from('professor_perfil')
      .select('nudges_enabled, menu_alerts_enabled')
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
  // nudges_enabled / menu_alerts_enabled defaults to true if column not present yet
  const perfil = perfilRes.data as { nudges_enabled?: boolean; menu_alerts_enabled?: boolean } | null
  const dismissedKeys    = new Set((dismissedRes.data ?? []).map(r => r.nudge_key as string))

  // Cobranças vencidas: pendentes em mês passado contam todas, no mês atual
  // só as cujo dia_cobranca < hoje.
  type CobrancaWithAluno = {
    id: string
    mes_referencia: string
    alunos: { dia_cobranca: number | null } | { dia_cobranca: number | null }[] | null
  }
  const cobrancasVencidasCount = (cobrancasPendentesData.data as CobrancaWithAluno[] | null ?? []).filter(c => {
    if (c.mes_referencia < mesAtual) return true
    if (c.mes_referencia === mesAtual) {
      const al = Array.isArray(c.alunos) ? c.alunos[0] : c.alunos
      const dia = al?.dia_cobranca ?? 1
      return dia < todayDay
    }
    return false
  }).length

  const aprovCount   = aprovacoesCount.count ?? 0
  const reposicCount = reposicoesUrgentesCount.count ?? 0

  return {
    hasStudents:              studentsCount > 0,
    studentsCount,
    hasActivePackages:        (pacoteAlunoCount.count ?? 0) > 0,
    hasCustos:                (custosCount.count ?? 0) > 0,
    hasMonthHistory:          mesesUnicos.size >= 2,
    monthsActive,
    aprovacoesPendentesCount: aprovCount,
    cobrancasVencidasCount,
    reposicoesUrgentesCount:  reposicCount,
    hasAprovacoesPendentes:   aprovCount > 0,
    hasCobrancasPendentes:    cobrancasVencidasCount > 0,
    hasReposicoesUrgentes:    reposicCount > 0,
    nudgesEnabled:            perfil?.nudges_enabled !== false,
    menuAlertsEnabled:        perfil?.menu_alerts_enabled !== false,
    dismissedNudges:          dismissedKeys,
  }
})

function monthDiff(isoStart: string, end: Date): number {
  const start = new Date(isoStart)
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}
