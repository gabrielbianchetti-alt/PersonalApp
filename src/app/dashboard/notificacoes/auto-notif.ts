'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

const DOW_TO_KEY: Record<number, string> = {
  1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab', 0: 'dom',
}

export async function gerarNotificacoesAutomaticasAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  let admin: SupabaseClient
  try { admin = createAdminClient() } catch { return }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const year = now.getFullYear()
  const month = now.getMonth()
  const mesRef = `${year}-${String(month + 1).padStart(2, '0')}`
  const todayKey = DOW_TO_KEY[now.getDay()] ?? ''
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowMonth = tomorrow.getMonth() + 1
  const tomorrowDay = tomorrow.getDate()

  async function createNotif(
    categoria: string,
    titulo: string,
    mensagem: string,
    link: string | null,
    dedupKey: string,
  ) {
    const { data: existing } = await admin
      .from('notificacoes_usuario')
      .select('id')
      .eq('usuario_id', user!.id)
      .eq('dedup_key', dedupKey)
      .maybeSingle()
    if (existing) return

    const { data: notif, error } = await admin
      .from('notificacoes')
      .insert({ tipo: 'sistema', categoria, titulo, mensagem, link, remetente_id: null })
      .select('id')
      .single()
    if (error || !notif) return

    await admin.from('notificacoes_usuario').insert({
      notificacao_id: notif.id,
      usuario_id: user!.id,
      lida: false,
      dedup_key: dedupKey,
    })

    // Enforce 50 limit — delete oldest
    const { data: all } = await admin
      .from('notificacoes_usuario')
      .select('id')
      .eq('usuario_id', user!.id)
      .order('created_at', { ascending: true })
    if (all && all.length > 50) {
      const toDelete = all.slice(0, all.length - 50).map((r: { id: string }) => r.id)
      await admin.from('notificacoes_usuario').delete().in('id', toDelete)
    }
  }

  // Fetch active students
  const { data: alunosRaw } = await admin
    .from('alunos')
    .select('id, nome, horarios, dia_cobranca, data_nascimento, created_at')
    .eq('professor_id', user.id)
    .eq('status', 'ativo')

  type AlunoRow = { id: string; nome: string; horarios: { dia: string; horario: string }[] | null; dia_cobranca: number | null; data_nascimento: string | null; created_at: string }
  const alunos = (alunosRaw ?? []) as AlunoRow[]

  // 1. Aulas hoje
  if (todayKey) {
    const aulasHoje = alunos.filter(a => (a.horarios ?? []).some(h => h.dia === todayKey))
    if (aulasHoje.length > 0) {
      const nomes = aulasHoje.slice(0, 3).map(a => a.nome).join(', ')
      const extra = aulasHoje.length > 3 ? ` e mais ${aulasHoje.length - 3}` : ''
      await createNotif(
        'aula',
        `Você tem ${aulasHoje.length} aula${aulasHoje.length > 1 ? 's' : ''} hoje`,
        `Alunos: ${nomes}${extra}.`,
        '/dashboard/agenda',
        `aulas_hoje_${todayStr}_${user.id}`,
      )
    }
  }

  // 2. Pagamento pendente há X dias (enviado mas não confirmado)
  const { data: cobrancasPendentes } = await admin
    .from('cobrancas')
    .select('id, aluno_id, created_at')
    .eq('professor_id', user.id)
    .eq('status', 'enviado')
    .eq('mes_referencia', mesRef)

  for (const cob of (cobrancasPendentes ?? []) as { aluno_id: string; created_at: string }[]) {
    const aluno = alunos.find(a => a.id === cob.aluno_id)
    if (!aluno) continue
    const dias = Math.floor((now.getTime() - new Date(cob.created_at).getTime()) / 86400000)
    if (dias >= 5) {
      await createNotif(
        'cobranca',
        `Pagamento pendente: ${aluno.nome}`,
        `Cobrança enviada há ${dias} dia${dias > 1 ? 's' : ''} sem confirmação.`,
        '/dashboard/financeiro?tab=cobranca',
        `cobranca_pendente_${cob.aluno_id}_${mesRef}_${todayStr}`,
      )
    }
  }

  // 3. Reposição vencendo em ≤ 3 dias
  const { data: reposicoes } = await admin
    .from('faltas')
    .select('id, aluno_id, prazo_vencimento')
    .eq('professor_id', user.id)
    .eq('status', 'pendente')
    .not('prazo_vencimento', 'is', null)

  for (const rep of (reposicoes ?? []) as { aluno_id: string; prazo_vencimento: string }[]) {
    const aluno = alunos.find(a => a.id === rep.aluno_id)
    if (!aluno) continue
    const diff = Math.ceil(
      (new Date(rep.prazo_vencimento + 'T00:00:00').getTime() - now.getTime()) / 86400000
    )
    if (diff >= 0 && diff <= 3) {
      await createNotif(
        'reposicao',
        `Reposição de ${aluno.nome} vence em breve`,
        diff === 0 ? 'A reposição vence hoje!' : `Vence em ${diff} dia${diff > 1 ? 's' : ''}.`,
        '/dashboard/agenda',
        `reposicao_${rep.aluno_id}_${rep.prazo_vencimento}_${todayStr}`,
      )
    }
  }

  // 4. Aniversário amanhã
  for (const aluno of alunos) {
    if (!aluno.data_nascimento) continue
    const [, bm, bd] = aluno.data_nascimento.split('-').map(Number)
    if (bm === tomorrowMonth && bd === tomorrowDay) {
      await createNotif(
        'aniversario',
        `🎂 Aniversário de ${aluno.nome} amanhã!`,
        `${aluno.nome} faz aniversário amanhã. Que tal mandar uma mensagem especial?`,
        '/dashboard/alunos',
        `aniversario_${aluno.id}_${year}_${tomorrowMonth}_${tomorrowDay}`,
      )
    }
  }

  // 5. Novo mês
  if (now.getDate() === 1) {
    await createNotif(
      'info',
      '🗓️ Novo mês chegou!',
      'Não esqueça de gerar as cobranças do mês para seus alunos.',
      '/dashboard/financeiro?tab=cobranca',
      `novo_mes_${mesRef}_${user.id}`,
    )
  }

  // 6. Churn: aluno sem horários há mais de 2 semanas
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  for (const aluno of alunos) {
    if (aluno.horarios && aluno.horarios.length > 0) continue
    if (!aluno.created_at || new Date(aluno.created_at) > twoWeeksAgo) continue
    await createNotif(
      'churn',
      `${aluno.nome} sem aulas agendadas`,
      `${aluno.nome} está ativo mas sem horários agendados há mais de 2 semanas.`,
      '/dashboard/alunos',
      `churn_${aluno.id}_sem_horario_${todayStr}`,
    )
  }
}
