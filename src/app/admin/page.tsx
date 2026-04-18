import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminDashboard } from './AdminDashboard'
import type { ProfessorRow, AdminStats } from './AdminDashboard'

export const metadata: Metadata = { title: 'Admin — PersonalHub' }

export default async function AdminPage() {
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return (
      <div className="p-8">
        <p style={{ color: '#EF4444' }}>
          Configuração incompleta: SUPABASE_SERVICE_ROLE_KEY não encontrada.
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Adicione essa variável de ambiente no painel do Vercel e faça um novo deploy.
        </p>
      </div>
    )
  }

  // ── 1. Auth users ──────────────────────────────────────────────────────────
  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) {
    return (
      <div className="p-8">
        <p style={{ color: '#EF4444' }}>Erro ao buscar usuários: {usersError.message}</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada no Vercel.
        </p>
      </div>
    )
  }

  // ── 2. Assinaturas ────────────────────────────────────────────────────────
  const { data: assinaturasRaw } = await admin
    .from('assinaturas')
    .select('professor_id, status, plano, trial_fim, periodo_fim, stripe_customer_id, stripe_subscription_id')

  type AssRow = {
    professor_id: string
    status: string
    plano: string | null
    trial_fim: string | null
    periodo_fim: string | null
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
  }
  const assMap: Record<string, AssRow> = {}
  for (const a of (assinaturasRaw ?? []) as AssRow[]) {
    assMap[a.professor_id] = a
  }

  // ── 3. Aluno counts ───────────────────────────────────────────────────────
  const { data: alunosRaw } = await admin.from('alunos').select('professor_id')
  const alunoCountMap: Record<string, number> = {}
  for (const a of alunosRaw ?? []) {
    alunoCountMap[a.professor_id] = (alunoCountMap[a.professor_id] ?? 0) + 1
  }
  const totalAlunos = (alunosRaw ?? []).length

  // ── 4. Cobrança counts ────────────────────────────────────────────────────
  const { data: cobrancasRaw } = await admin.from('cobrancas').select('professor_id')
  const cobrancaCountMap: Record<string, number> = {}
  for (const c of cobrancasRaw ?? []) {
    cobrancaCountMap[c.professor_id] = (cobrancaCountMap[c.professor_id] ?? 0) + 1
  }

  // ── 5. Professor perfil ───────────────────────────────────────────────────
  const { data: perfis } = await admin.from('professor_perfil').select('professor_id, nome')
  const perfilMap: Record<string, string> = {}
  for (const p of perfis ?? []) {
    perfilMap[p.professor_id] = p.nome
  }

  // ── 6. Build professor rows ───────────────────────────────────────────────
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  const professors: ProfessorRow[] = users.map((u) => {
    const bannedUntil = (u as unknown as Record<string, unknown>).banned_until as string | null | undefined
    const isBlocked   = !!bannedUntil && new Date(bannedUntil).getTime() > now
    const ass         = assMap[u.id] ?? null
    return {
      id:               u.id,
      email:            u.email ?? '—',
      nome:             perfilMap[u.id] ?? (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? '—',
      created_at:       u.created_at,
      last_sign_in_at:  u.last_sign_in_at ?? null,
      is_blocked:       isBlocked,
      aluno_count:      alunoCountMap[u.id]    ?? 0,
      cobranca_count:   cobrancaCountMap[u.id] ?? 0,
      assinatura: ass ? {
        status:                  ass.status,
        plano:                   ass.plano,
        trial_fim:               ass.trial_fim,
        periodo_fim:             ass.periodo_fim,
        stripe_customer_id:      ass.stripe_customer_id,
        stripe_subscription_id:  ass.stripe_subscription_id,
      } : null,
    }
  })

  // ── 7. Stats ──────────────────────────────────────────────────────────────
  const activeProfessors = professors.filter(p => {
    if (!p.last_sign_in_at) return false
    return now - new Date(p.last_sign_in_at).getTime() < thirtyDaysMs
  }).length

  const weeklySignups = Array<number>(8).fill(0)
  for (const u of users) {
    const created  = new Date(u.created_at).getTime()
    const weeksAgo = Math.floor((now - created) / (7 * 24 * 60 * 60 * 1000))
    if (weeksAgo < 8) weeklySignups[7 - weeksAgo]++
  }

  // Subscription stats
  const trials    = professors.filter(p => p.assinatura?.status === 'trial').length
  const ativos    = professors.filter(p => p.assinatura?.status === 'active').length
  const expirados = professors.filter(p =>
    p.assinatura?.status === 'canceled' || p.assinatura?.status === 'expired'
  ).length
  const semAss    = professors.filter(p => !p.assinatura).length

  // MRR: active mensais × R$29.90 + active anuais × R$249.90/12
  const mrr = professors
    .filter(p => p.assinatura?.status === 'active')
    .reduce((sum, p) => sum + (p.assinatura?.plano === 'anual' ? 249.9 / 12 : 29.9), 0)

  const conversao = professors.length > 0
    ? Math.round((ativos / professors.length) * 100)
    : 0

  // Conversion funnel by week (how many of weekly signups converted)
  // Simple approach: trial→active counts per week using periodo_fim vs created_at
  const conversionData = Array<number>(8).fill(0)
  for (const p of professors) {
    if (p.assinatura?.status !== 'active') continue
    const created  = new Date(p.created_at).getTime()
    const weeksAgo = Math.floor((now - created) / (7 * 24 * 60 * 60 * 1000))
    if (weeksAgo < 8) conversionData[7 - weeksAgo]++
  }

  const stats: AdminStats = {
    total_professors:  professors.length,
    active_professors: activeProfessors,
    total_alunos:      totalAlunos,
    weekly_signups:    weeklySignups,
    trials,
    assinantes:        ativos,
    expirados,
    sem_assinatura:    semAss,
    mrr,
    conversao,
    conversion_data:   conversionData,
  }

  return <AdminDashboard professors={professors} stats={stats} />
}
