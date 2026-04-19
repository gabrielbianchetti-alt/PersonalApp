import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DashboardHome } from './DashboardHome'
import { gerarNotificacoesAutomaticasAction } from './notificacoes/auto-notif'
import { countWeekdaysInMonth, toDateStr, DOW_TO_KEY } from '@/lib/utils/date'
import { isDemoMode } from '@/lib/demo/mode'
import {
  getDemoAlunos, getDemoCobrancas, getDemoEventos, getDemoFaltas, getDemoPacotes,
  DEMO_PROFESSOR_NOME,
} from '@/lib/demo/fixtures'

export const metadata: Metadata = { title: 'Dashboard — PersonalHub' }

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const demo = await isDemoMode()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !demo) return null

  // Generate auto-notifications (non-blocking) — só em modo real
  if (!demo) void gerarNotificacoesAutomaticasAction()

  const professorNome: string = demo
    ? DEMO_PROFESSOR_NOME
    : ((user!.user_metadata?.full_name as string | undefined) ?? 'Professor')

  const now      = new Date()
  const year     = now.getFullYear()
  const month    = now.getMonth()
  const mesRef   = `${year}-${String(month + 1).padStart(2, '0')}`
  const todayStr = toDateStr(now)
  const todayKey = DOW_TO_KEY[now.getDay()] ?? ''

  // Tomorrow
  const tomorrow     = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowKey  = DOW_TO_KEY[tomorrow.getDay()] ?? ''

  // 7 days from now (for urgent faltas)
  const nextWeek     = new Date(now)
  nextWeek.setDate(now.getDate() + 7)
  const nextWeekStr  = toDateStr(nextWeek)

  // ── parallel fetches (ou dados de demo) ──────────────────────────────────
  const [
    { data: alunosRaw },
    { data: cobrancas },
    { data: eventosHoje },
    { data: creditos },
    { data: faltasUrgentes },
    { data: pacotesRaw },
  ] = demo ? await buildDemoDataBundle(todayStr, nextWeekStr) : await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, horarios, duracao, local, modelo_cobranca, valor, whatsapp, status, dia_cobranca, data_nascimento, created_at')
      .eq('professor_id', user!.id)
      .eq('status', 'ativo'),
    supabase
      .from('cobrancas')
      .select('id, aluno_id, status, valor, created_at')
      .eq('professor_id', user!.id)
      .eq('mes_referencia', mesRef),
    supabase
      .from('eventos_agenda')
      .select('id, aluno_id, horario_inicio, tipo')
      .eq('professor_id', user!.id)
      .eq('data_especifica', todayStr)
      .in('tipo', ['reposicao', 'aula_extra']),
    supabase
      .from('faltas')
      .select('aluno_id, credito_valor')
      .eq('professor_id', user!.id)
      .eq('status', 'credito')
      .or(`mes_validade.is.null,mes_validade.eq.${mesRef}`),
    supabase
      .from('faltas')
      .select('id')
      .eq('professor_id', user!.id)
      .eq('status', 'pendente')
      .gte('prazo_vencimento', todayStr)
      .lte('prazo_vencimento', nextWeekStr),
    supabase
      .from('pacotes')
      .select('aluno_id, quantidade_total, quantidade_usada, data_vencimento, status, alunos:aluno_id(nome)')
      .eq('professor_id', user!.id)
      .in('status', ['ativo', 'vencido']),
  ])

  const alunos = (alunosRaw ?? []) as {
    id: string; nome: string; horarios: { dia: string; horario: string }[] | null
    duracao: number | null; local: string | null; modelo_cobranca: string; valor: number
    whatsapp: string | null; status: string; dia_cobranca: number | null
    data_nascimento: string | null; created_at: string | null
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

  // ── aluno map ─────────────────────────────────────────────────────────────
  const alunoMap = Object.fromEntries(alunos.map(a => [a.id, a]))

  // ── aulas de hoje ─────────────────────────────────────────────────────────
  const aulasRegulares = todayKey
    ? alunos
        .map(a => {
          const h = ((a.horarios ?? []) as { dia: string; horario: string }[]).find(x => x.dia === todayKey)
          if (!h) return null
          return { alunoId: a.id, alunoNome: a.nome, horario: h.horario.slice(0, 5), local: a.local ?? '', tipo: 'regular' as const }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : []

  const aulasEvento = (eventosHoje ?? []).map(e => ({
    alunoId:   e.aluno_id ?? '',
    alunoNome: alunoMap[e.aluno_id ?? '']?.nome ?? 'Aluno',
    horario:   String(e.horario_inicio ?? '').slice(0, 5),
    local:     alunoMap[e.aluno_id ?? '']?.local ?? '',
    tipo:      (e.tipo === 'aula_extra' ? 'aula_extra' : 'reposicao') as 'reposicao' | 'aula_extra',
  })).filter(e => e.alunoId)

  const aulasHoje = [...aulasRegulares, ...aulasEvento].sort((a, b) => a.horario.localeCompare(b.horario))

  // ── aulas de amanhã ───────────────────────────────────────────────────────
  const aulasAmanha = tomorrowKey
    ? alunos.filter(a =>
        ((a.horarios ?? []) as { dia: string; horario: string }[]).some(h => h.dia === tomorrowKey)
      ).length
    : 0

  // ── aniversários ──────────────────────────────────────────────────────────
  const tomorrowDay   = tomorrow.getDate()
  const tomorrowMonth = tomorrow.getMonth() + 1
  const currentMonth  = month + 1

  const aniversariosAmanha: string[] = []
  const aniversariosMes: string[] = []

  for (const a of alunos) {
    const dn = a.data_nascimento
    if (!dn) continue
    const parts = dn.split('-').map(Number)
    const mm = parts[1], dd = parts[2]
    if (mm === tomorrowMonth && dd === tomorrowDay) {
      aniversariosAmanha.push(a.nome.split(' ')[0])
    } else if (mm === currentMonth) {
      aniversariosMes.push(a.nome.split(' ')[0])
    }
  }

  // ── novos alunos este mês ─────────────────────────────────────────────────
  const novosAlunosMes = alunos.filter(a => a.created_at?.startsWith(mesRef) ?? false).length

  // ── remarcações urgentes ──────────────────────────────────────────────────
  const remarcacoesUrgentes = (faltasUrgentes ?? []).length

  // ── créditos por aluno ────────────────────────────────────────────────────
  const creditosPorAluno: Record<string, number> = {}
  for (const row of (creditos ?? [])) {
    if (row.credito_valor) {
      creditosPorAluno[row.aluno_id] = (creditosPorAluno[row.aluno_id] ?? 0) + Number(row.credito_valor)
    }
  }

  // ── todos alunos com status de cobrança ───────────────────────────────────
  const todayMs = new Date(todayStr + 'T00:00:00').getTime()
  const todosAlunos = alunos.map(a => {
    const c            = (cobrancas ?? []).find(r => r.aluno_id === a.id)
    const createdDate  = c?.created_at ? new Date(c.created_at) : null
    const diasDesdeEnvio = createdDate
      ? Math.floor((todayMs - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const gross = a.modelo_cobranca === 'mensalidade'
      ? Number(a.valor)
      : ((a.horarios ?? []) as { dia: string; horario: string }[]).reduce(
          (s, h) => s + (weekdayCounts[h.dia] ?? 0), 0
        ) * Number(a.valor)
    const credito     = creditosPorAluno[a.id] ?? 0
    const valorMensal = Math.max(0, gross - credito)

    return {
      alunoId:       a.id,
      alunoNome:     a.nome,
      whatsapp:      a.whatsapp ?? null,
      valor:         valorMensal,
      dia_cobranca:  a.dia_cobranca ?? 1,
      cobrancaId:    c?.id ?? null,
      status:        ((c?.status) ?? 'pendente') as 'pendente' | 'enviado' | 'pago',
      diasDesdeEnvio,
    }
  }).sort((a, b) => {
    const order = { pendente: 0, enviado: 1, pago: 2 }
    return order[a.status] - order[b.status]
  })

  // ── pacotes alertas ───────────────────────────────────────────────────────
  const pacotesAlertas = (pacotesRaw ?? []).map(p => {
    const al = (p as unknown as { alunos: { nome: string } | { nome: string }[] | null }).alunos
    const nome = Array.isArray(al) ? al[0]?.nome : al?.nome
    return {
      aluno_nome:       nome ?? '—',
      quantidade_total: p.quantidade_total as number,
      quantidade_usada: p.quantidade_usada as number,
      data_vencimento:  p.data_vencimento as string,
      status:           p.status as 'ativo' | 'vencido' | 'finalizado',
    }
  })

  return (
    <DashboardHome
      professorNome={professorNome}
      faturamento={faturamento}
      totalAlunos={alunos.length}
      aulasHoje={aulasHoje}
      aulasAmanha={aulasAmanha}
      todosAlunos={todosAlunos}
      mesRef={mesRef}
      remarcacoesUrgentes={remarcacoesUrgentes}
      aniversariosAmanha={aniversariosAmanha}
      aniversariosMes={aniversariosMes}
      novosAlunosMes={novosAlunosMes}
      pacotesAlertas={pacotesAlertas}
      showDemoEmptyState={!demo && alunos.length === 0}
    />
  )
}

// ─── Demo data bundle (matches the shape of the real Supabase responses) ─────

async function buildDemoDataBundle(todayStr: string, nextWeekStr: string) {
  const alunosDemo     = getDemoAlunos()
  const cobrancasDemo  = getDemoCobrancas()
  const eventosDemo    = getDemoEventos()
  const faltasDemo     = getDemoFaltas()
  const pacotesDemo    = getDemoPacotes()

  const eventosHoje = eventosDemo
    .filter(e => e.data_especifica === todayStr && (e.tipo === 'reposicao' || e.tipo === 'aula_extra'))
    .map(e => ({ id: e.id, aluno_id: e.aluno_id, horario_inicio: e.horario_inicio, tipo: e.tipo }))

  const creditos = faltasDemo
    .filter(f => f.status === 'credito')
    .map(f => ({ aluno_id: f.aluno_id, credito_valor: f.credito_valor }))

  const faltasUrgentes = faltasDemo
    .filter(f => f.status === 'pendente' && f.prazo_vencimento
      && f.prazo_vencimento >= todayStr && f.prazo_vencimento <= nextWeekStr)
    .map(f => ({ id: f.id }))

  // Shape dos pacotes com o join alunos:aluno_id(nome)
  const alunosMap = new Map(alunosDemo.map(a => [a.id, a.nome]))
  const pacotesShaped = pacotesDemo.map(p => ({
    ...p,
    alunos: { nome: alunosMap.get(p.aluno_id) ?? '—' },
  }))

  return [
    { data: alunosDemo },
    { data: cobrancasDemo },
    { data: eventosHoje },
    { data: creditos },
    { data: faltasUrgentes },
    { data: pacotesShaped },
  ] as const
}
