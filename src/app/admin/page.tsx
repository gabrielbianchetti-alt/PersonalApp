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
        <p style={{ color: '#FF5252' }}>
          Configuração incompleta: SUPABASE_SERVICE_ROLE_KEY não encontrada.
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Adicione essa variável de ambiente no painel do Vercel e faça um novo deploy.
        </p>
      </div>
    )
  }

  // ── 1. Fetch all auth users (up to 1000) ───────────────────────────────────
  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) {
    return (
      <div className="p-8">
        <p style={{ color: '#FF5252' }}>
          Erro ao buscar usuários: {usersError.message}
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada no Vercel.
        </p>
      </div>
    )
  }

  // ── 2. Fetch aluno counts per professor ────────────────────────────────────
  const { data: alunosRaw } = await admin
    .from('alunos')
    .select('professor_id')

  const alunoCountMap: Record<string, number> = {}
  for (const a of alunosRaw ?? []) {
    alunoCountMap[a.professor_id] = (alunoCountMap[a.professor_id] ?? 0) + 1
  }
  const totalAlunos = (alunosRaw ?? []).length

  // ── 3. Fetch cobrança counts per professor ─────────────────────────────────
  const { data: cobrancasRaw } = await admin
    .from('cobrancas')
    .select('professor_id')

  const cobrancaCountMap: Record<string, number> = {}
  for (const c of cobrancasRaw ?? []) {
    cobrancaCountMap[c.professor_id] = (cobrancaCountMap[c.professor_id] ?? 0) + 1
  }

  // ── 4. Fetch professor profiles (nome, foto) ───────────────────────────────
  const { data: perfis } = await admin
    .from('professor_perfil')
    .select('professor_id, nome')

  const perfilMap: Record<string, string> = {}
  for (const p of perfis ?? []) {
    perfilMap[p.professor_id] = p.nome
  }

  // ── 5. Build professor rows ────────────────────────────────────────────────
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  const professors: ProfessorRow[] = users.map((u) => {
    const bannedUntil = (u as unknown as Record<string, unknown>).banned_until as string | null | undefined
    const isBlocked = !!bannedUntil && new Date(bannedUntil).getTime() > now
    return {
      id: u.id,
      email: u.email ?? '—',
      nome: perfilMap[u.id] ?? (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? '—',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      is_blocked: isBlocked,
      aluno_count: alunoCountMap[u.id] ?? 0,
      cobranca_count: cobrancaCountMap[u.id] ?? 0,
    }
  })

  // ── 6. Stats ───────────────────────────────────────────────────────────────
  const activeProfessors = professors.filter((p) => {
    if (!p.last_sign_in_at) return false
    return now - new Date(p.last_sign_in_at).getTime() < thirtyDaysMs
  }).length

  // Weekly signups — last 8 weeks (index 0 = oldest, 7 = most recent)
  const weeklySignups = Array<number>(8).fill(0)
  for (const u of users) {
    const created = new Date(u.created_at).getTime()
    const weeksAgo = Math.floor((now - created) / (7 * 24 * 60 * 60 * 1000))
    if (weeksAgo < 8) weeklySignups[7 - weeksAgo]++
  }

  const stats: AdminStats = {
    total_professors: professors.length,
    active_professors: activeProfessors,
    total_alunos: totalAlunos,
    weekly_signups: weeklySignups,
  }

  return <AdminDashboard professors={professors} stats={stats} />
}
