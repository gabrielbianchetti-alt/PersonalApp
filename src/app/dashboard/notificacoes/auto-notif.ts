'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

const DOW_TO_KEY: Record<number, string> = {
  1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab', 0: 'dom',
}

type AlunoRow = {
  id: string
  nome: string
  horarios: { dia: string; horario: string }[] | null
  dia_cobranca: number | null
  data_nascimento: string | null
  created_at: string
}

type Candidate = {
  categoria: string
  titulo: string
  mensagem: string
  link: string | null
  dedup_key: string
}

export async function gerarNotificacoesAutomaticasAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  let admin: SupabaseClient
  try { admin = createAdminClient() } catch { return }

  const now = new Date()
  const todayStr    = now.toISOString().split('T')[0]
  const year        = now.getFullYear()
  const month       = now.getMonth()
  const mesRef      = `${year}-${String(month + 1).padStart(2, '0')}`
  const todayKey    = DOW_TO_KEY[now.getDay()] ?? ''
  const tomorrow    = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowMonth = tomorrow.getMonth() + 1
  const tomorrowDay   = tomorrow.getDate()
  const twoWeeksAgo   = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  // ── 1 round-trip: fetch all data in parallel ──────────────────────────────
  const [alunosRes, dedupRes, cobrancasRes, reposicoesRes] = await Promise.all([
    admin
      .from('alunos')
      .select('id, nome, horarios, dia_cobranca, data_nascimento, created_at')
      .eq('professor_id', user.id)
      .eq('status', 'ativo'),
    // Pre-load all existing dedup keys — eliminates per-notification SELECT
    admin
      .from('notificacoes_usuario')
      .select('dedup_key')
      .eq('usuario_id', user.id)
      .not('dedup_key', 'is', null),
    admin
      .from('cobrancas')
      .select('aluno_id, created_at')
      .eq('professor_id', user.id)
      .eq('status', 'enviado')
      .eq('mes_referencia', mesRef),
    admin
      .from('faltas')
      .select('aluno_id, prazo_vencimento')
      .eq('professor_id', user.id)
      .eq('status', 'pendente')
      .not('prazo_vencimento', 'is', null),
  ])

  const alunos       = (alunosRes.data ?? []) as AlunoRow[]
  const existingDedup = new Set(
    (dedupRes.data ?? [])
      .map((r: { dedup_key: string | null }) => r.dedup_key)
      .filter(Boolean) as string[]
  )

  // ── Collect candidates (skip already-sent keys) ───────────────────────────
  const candidates: Candidate[] = []

  function maybeAdd(c: Candidate) {
    if (existingDedup.has(c.dedup_key)) return
    existingDedup.add(c.dedup_key) // guard against duplicates within same run
    candidates.push(c)
  }

  // 1. Aulas hoje
  if (todayKey) {
    const aulasHoje = alunos.filter(a => (a.horarios ?? []).some(h => h.dia === todayKey))
    if (aulasHoje.length > 0) {
      const nomes = aulasHoje.slice(0, 3).map(a => a.nome).join(', ')
      const extra = aulasHoje.length > 3 ? ` e mais ${aulasHoje.length - 3}` : ''
      maybeAdd({
        categoria: 'aula',
        titulo:    `Você tem ${aulasHoje.length} aula${aulasHoje.length > 1 ? 's' : ''} hoje`,
        mensagem:  `Alunos: ${nomes}${extra}.`,
        link:      '/dashboard/agenda',
        dedup_key: `aulas_hoje_${todayStr}_${user.id}`,
      })
    }
  }

  // 2. Cobranças pendentes há ≥ 5 dias
  for (const cob of (cobrancasRes.data ?? []) as { aluno_id: string; created_at: string }[]) {
    const aluno = alunos.find(a => a.id === cob.aluno_id)
    if (!aluno) continue
    const dias = Math.floor((now.getTime() - new Date(cob.created_at).getTime()) / 86400000)
    if (dias >= 5) {
      maybeAdd({
        categoria: 'cobranca',
        titulo:    `Pagamento pendente: ${aluno.nome}`,
        mensagem:  `Cobrança enviada há ${dias} dia${dias > 1 ? 's' : ''} sem confirmação.`,
        link:      '/dashboard/financeiro?tab=cobranca',
        dedup_key: `cobranca_pendente_${cob.aluno_id}_${mesRef}_${todayStr}`,
      })
    }
  }

  // 3. Reposições vencendo em ≤ 3 dias
  for (const rep of (reposicoesRes.data ?? []) as { aluno_id: string; prazo_vencimento: string }[]) {
    const aluno = alunos.find(a => a.id === rep.aluno_id)
    if (!aluno) continue
    const diff = Math.ceil(
      (new Date(rep.prazo_vencimento + 'T00:00:00').getTime() - now.getTime()) / 86400000
    )
    if (diff >= 0 && diff <= 3) {
      maybeAdd({
        categoria: 'reposicao',
        titulo:    `Reposição de ${aluno.nome} vence em breve`,
        mensagem:  diff === 0 ? 'A reposição vence hoje!' : `Vence em ${diff} dia${diff > 1 ? 's' : ''}.`,
        link:      '/dashboard/agenda',
        dedup_key: `reposicao_${rep.aluno_id}_${rep.prazo_vencimento}_${todayStr}`,
      })
    }
  }

  // 4. Aniversário amanhã
  for (const aluno of alunos) {
    if (!aluno.data_nascimento) continue
    const [, bm, bd] = aluno.data_nascimento.split('-').map(Number)
    if (bm === tomorrowMonth && bd === tomorrowDay) {
      maybeAdd({
        categoria: 'aniversario',
        titulo:    `Aniversário de ${aluno.nome} amanhã!`,
        mensagem:  `${aluno.nome} faz aniversário amanhã. Que tal mandar uma mensagem especial?`,
        link:      '/dashboard/alunos',
        dedup_key: `aniversario_${aluno.id}_${year}_${tomorrowMonth}_${tomorrowDay}`,
      })
    }
  }

  // 5. Novo mês
  if (now.getDate() === 1) {
    maybeAdd({
      categoria: 'info',
      titulo:    '🗓️ Novo mês chegou!',
      mensagem:  'Não esqueça de gerar as cobranças do mês para seus alunos.',
      link:      '/dashboard/financeiro?tab=cobranca',
      dedup_key: `novo_mes_${mesRef}_${user.id}`,
    })
  }

  // 6. Churn: aluno ativo sem horários há mais de 2 semanas
  for (const aluno of alunos) {
    if (aluno.horarios && aluno.horarios.length > 0) continue
    if (!aluno.created_at || new Date(aluno.created_at) > twoWeeksAgo) continue
    maybeAdd({
      categoria: 'churn',
      titulo:    `${aluno.nome} sem aulas agendadas`,
      mensagem:  `${aluno.nome} está ativo mas sem horários agendados há mais de 2 semanas.`,
      link:      '/dashboard/alunos',
      dedup_key: `churn_${aluno.id}_sem_horario_${todayStr}`,
    })
  }

  if (candidates.length === 0) return

  // ── 2 round-trips: batch insert all notifications ─────────────────────────
  const { data: notifs, error: notifErr } = await admin
    .from('notificacoes')
    .insert(candidates.map(c => ({
      tipo:         'sistema',
      categoria:    c.categoria,
      titulo:       c.titulo,
      mensagem:     c.mensagem,
      link:         c.link,
      remetente_id: null,
    })))
    .select('id')

  if (notifErr || !notifs?.length) return

  await admin.from('notificacoes_usuario').insert(
    notifs.map((n, i) => ({
      notificacao_id: n.id,
      usuario_id:     user.id,
      lida:           false,
      dedup_key:      candidates[i].dedup_key,
    }))
  )

  // ── 50-limit enforcement — once per run, not per notification ─────────────
  const { data: all } = await admin
    .from('notificacoes_usuario')
    .select('id')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: true })

  if (all && all.length > 50) {
    const toDelete = all.slice(0, all.length - 50).map((r: { id: string }) => r.id)
    await admin.from('notificacoes_usuario').delete().in('id', toDelete)
  }
}
