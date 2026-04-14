import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DashboardHome } from './DashboardHome'

export const metadata: Metadata = { title: 'Dashboard — PersonalHub' }

// ─── helpers ─────────────────────────────────────────────────────────────────

const DOW_TO_KEY: Record<number, string> = {
  1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab', 0: 'dom',
}

function countWeekdaysInMonth(year: number, month: number): Record<string, number> {
  const counts: Record<string, number> = { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0, dom: 0 }
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const key = DOW_TO_KEY[new Date(year, month, d).getDay()]
    if (key) counts[key]++
  }
  return counts
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const professorNome: string =
    (user.user_metadata?.full_name as string | undefined) ?? 'Professor'

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const mesRef = `${year}-${String(month + 1).padStart(2, '0')}`
  const todayStr = now.toISOString().split('T')[0]
  const todayKey = DOW_TO_KEY[now.getDay()] ?? ''

  // ── parallel fetches ──────────────────────────────────────────────────────
  const [
    { data: alunosRaw },
    { data: custos },
    { data: cobrancas },
    { data: faltasPendentes },
    { data: eventosHoje },
    { data: metaRow },
    { data: creditos },
  ] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, horarios, duracao, local, modelo_cobranca, valor, data_nascimento, whatsapp, status, dia_cobranca')
      .eq('professor_id', user.id)
      .eq('status', 'ativo'),
    supabase
      .from('custos')
      .select('valor')
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesRef)
      .or('ativo.is.null,ativo.eq.true'),
    supabase
      .from('cobrancas')
      .select('id, aluno_id, status, valor, created_at')
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesRef),
    supabase
      .from('faltas')
      .select('id, aluno_id, data_falta, prazo_vencimento, culpa, status')
      .eq('professor_id', user.id)
      .eq('status', 'pendente')
      .order('prazo_vencimento', { ascending: true }),
    supabase
      .from('eventos_agenda')
      .select('id, aluno_id, data_especifica, hora_inicio, local, tipo, descricao')
      .eq('professor_id', user.id)
      .eq('data_especifica', todayStr)
      .eq('tipo', 'reposicao'),
    supabase
      .from('metas')
      .select('meta_mensal')
      .eq('professor_id', user.id)
      .maybeSingle(),
    // Credits to be subtracted from per-aula billing
    supabase
      .from('faltas')
      .select('aluno_id, credito_valor')
      .eq('professor_id', user.id)
      .eq('status', 'credito')
      .or(`mes_validade.is.null,mes_validade.eq.${mesRef}`),
  ])

  const alunos = (alunosRaw ?? []) as {
    id: string; nome: string; horarios: { dia: string; horario: string }[] | null
    duracao: number | null; local: string | null; modelo_cobranca: string; valor: number
    data_nascimento: string | null; whatsapp: string | null; status: string; dia_cobranca: number | null
  }[]

  // ── faturamento bruto ─────────────────────────────────────────────────────
  const weekdayCounts = countWeekdaysInMonth(year, month)

  const faturamento = alunos.reduce((sum, a) => {
    if (a.modelo_cobranca === 'mensalidade') return sum + Number(a.valor)
    const aulas = ((a.horarios ?? []) as { dia: string; horario: string }[]).reduce(
      (s, h) => s + (weekdayCounts[h.dia] ?? 0), 0
    )
    return sum + aulas * Number(a.valor)
  }, 0)

  // ── custos e lucro ────────────────────────────────────────────────────────
  const custoTotal = (custos ?? []).reduce((s, c) => s + Number(c.valor), 0)
  const lucro = faturamento - custoTotal
  const margem = faturamento > 0 ? Math.round((lucro / faturamento) * 100) : 0

  // ── recebimentos (derived from todosAlunos below) ────────────────────────

  // ── aulas de hoje ─────────────────────────────────────────────────────────
  const alunoMap = Object.fromEntries(alunos.map(a => [a.id, a]))

  const aulasRegulares = todayKey ? alunos
    .map(a => {
      const h = ((a.horarios ?? []) as { dia: string; horario: string }[]).find(x => x.dia === todayKey)
      if (!h) return null
      return { alunoId: a.id, alunoNome: a.nome, horario: h.horario.slice(0, 5), local: a.local ?? '', tipo: 'regular' as const }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
  : []

  const aulasReposicao = (eventosHoje ?? []).map(e => ({
    alunoId: e.aluno_id,
    alunoNome: alunoMap[e.aluno_id]?.nome ?? 'Aluno',
    horario: String(e.hora_inicio ?? '').slice(0, 5),
    local: e.local ?? alunoMap[e.aluno_id]?.local ?? '',
    tipo: 'reposicao' as const,
  }))

  const aulasHoje = [...aulasRegulares, ...aulasReposicao].sort((a, b) =>
    a.horario.localeCompare(b.horario)
  )

  // ── aniversários do mês ───────────────────────────────────────────────────
  const aniversarios = alunos
    .filter(a => {
      if (!a.data_nascimento) return false
      const birthMonth = parseInt(a.data_nascimento.split('-')[1], 10) - 1
      return birthMonth === month
    })
    .map(a => {
      const birthDay = parseInt(a.data_nascimento!.split('-')[2], 10)
      const birthDate = new Date(year, month, birthDay)
      const today = new Date(year, month, now.getDate())
      const diffMs = birthDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return { id: a.id, nome: a.nome, dia: birthDay, diasRestantes: diffDays }
    })
    .sort((a, b) => a.dia - b.dia)

  // ── reposições pendentes ──────────────────────────────────────────────────
  const reposicoesPendentes = (faltasPendentes ?? []).map(f => {
    const prazoDate = new Date(f.prazo_vencimento + 'T00:00:00')
    const todayDate = new Date(todayStr + 'T00:00:00')
    const diffDays = Math.ceil(
      (prazoDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      id: f.id,
      alunoId: f.aluno_id,
      alunoNome: alunoMap[f.aluno_id]?.nome ?? 'Aluno',
      dataFalta: f.data_falta,
      prazo: f.prazo_vencimento,
      diasRestantes: diffDays,
      culpa: f.culpa as 'aluno' | 'professor',
    }
  })

  // ── créditos por aluno para o mês atual ──────────────────────────────────
  const creditosPorAluno: Record<string, number> = {}
  for (const row of (creditos ?? [])) {
    if (row.credito_valor) {
      creditosPorAluno[row.aluno_id] = (creditosPorAluno[row.aluno_id] ?? 0) + Number(row.credito_valor)
    }
  }

  // ── todos alunos com status de cobrança do mês ───────────────────────────
  // IMPORTANT: valor must be the monthly TOTAL, not the per-aula unit price.
  // For 'por_aula': count exact weekday occurrences in the month × unit price − credits.
  // For 'mensalidade': the fixed value − credits.
  const todayMs = new Date(todayStr + 'T00:00:00').getTime()
  const todosAlunos = alunos.map(a => {
    const c = (cobrancas ?? []).find(r => r.aluno_id === a.id)
    const createdDate = c?.created_at ? new Date(c.created_at) : null
    const diasDesdeEnvio = createdDate
      ? Math.floor((todayMs - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Calculate the gross monthly total using the same weekdayCounts already computed above
    const gross = a.modelo_cobranca === 'mensalidade'
      ? Number(a.valor)
      : ((a.horarios ?? []) as { dia: string; horario: string }[]).reduce(
          (s, h) => s + (weekdayCounts[h.dia] ?? 0), 0
        ) * Number(a.valor)
    const credito = creditosPorAluno[a.id] ?? 0
    const valorMensal = Math.max(0, gross - credito)

    return {
      alunoId:       a.id,
      alunoNome:     a.nome,
      whatsapp:      a.whatsapp ?? null,
      valor:         valorMensal,   // monthly total, not unit price
      dia_cobranca:  a.dia_cobranca ?? 1,
      cobrancaId:    c?.id ?? null,
      status:        ((c?.status) ?? 'pendente') as 'pendente' | 'enviado' | 'pago',
      diasDesdeEnvio,
    }
  }).sort((a, b) => {
    const order = { pendente: 0, enviado: 1, pago: 2 }
    return order[a.status] - order[b.status]
  })

  return (
    <DashboardHome
      professorNome={professorNome}
      faturamento={faturamento}
      lucro={lucro}
      margem={margem}
      custoTotal={custoTotal}
      totalAlunos={alunos.length}
      aulasHoje={aulasHoje}
      reposicoesPendentes={reposicoesPendentes}
      aniversarios={aniversarios}
      alunos={alunos.map(a => ({ id: a.id, nome: a.nome }))}
      todosAlunos={todosAlunos}
      mesRef={mesRef}
    />
  )
}
