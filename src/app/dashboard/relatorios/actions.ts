'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AlunoRelatorio {
  id: string
  nome: string
  modelo_cobranca: string
  valor: number
  valorMensal: number
  horarios: { dia: string; horario: string }[]
  status: 'pendente' | 'enviado' | 'pago' | null
  forma_pagamento: string
}

export interface CustoRelatorio {
  nome: string
  categoria: string
  tipo: 'fixo' | 'variavel'
  valor: number
}

export interface FinanceiroReportData {
  professorNome: string
  professorEmail: string
  mesRef: string
  alunos: AlunoRelatorio[]
  custos: CustoRelatorio[]
  faturamentoBruto: number
  totalFixos: number
  totalVariaveis: number
  totalCustos: number
  lucroLiquido: number
  margemLucro: number
}

export interface ProdutividadeReportData {
  mesRef: string
  totalAlunosAtivos: number
  totalAulasNoMes: number
  totalFaltas: number
  faltasPorAluno: { nome: string; total: number }[]
  faltasCulpaAluno: number
  faltasCulpaProfessor: number
  reposicoesRealizadas: number
  reposicoesPendentes: number
  reposicoesVencidas: number
  horasTrabalhadas: number
  mediaAulasPorDia: number
  alunoMaisFaltas: string
  diaMaisCheio: string
}

export interface PrevisaoMes {
  mesRef: string
  label: string
  faturamentoPrevisto: number
  custosPrevisto: number
  lucroPrevisto: number
}

export interface PrevisaoReportData {
  mesAtual: string
  faturamentoAtual: number
  meses: PrevisaoMes[]
  ticketMedio: number
  pessimista: number
  atual: number
  otimista: number
  metaLucro: number
  alunosNecessarios: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Financeiro Report ─────────────────────────────────────────────────────────

export async function getFinanceiroReportData(
  mesRef: string,
): Promise<{ data?: FinanceiroReportData; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const [yearNum, monthNum] = mesRef.split('-').map(Number)
  const weekdayCounts = countWeekdaysInMonth(yearNum, monthNum - 1)

  const [
    { data: alunos },
    { data: custos },
    { data: cobrancas },
    { data: creditos },
  ] = await Promise.all([
    supabase.from('alunos')
      .select('id, nome, horarios, modelo_cobranca, valor, forma_pagamento')
      .eq('professor_id', user.id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase.from('custos')
      .select('nome, categoria, tipo, valor')
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesRef)
      .or('ativo.is.null,ativo.eq.true')
      .order('tipo').order('categoria'),
    supabase.from('cobrancas')
      .select('aluno_id, status')
      .eq('professor_id', user.id)
      .eq('mes_referencia', mesRef),
    supabase.from('faltas')
      .select('aluno_id, credito_valor')
      .eq('professor_id', user.id)
      .eq('status', 'credito')
      .or(`mes_validade.is.null,mes_validade.eq.${mesRef}`),
  ])

  const cobrancaMap: Record<string, string> = {}
  for (const c of (cobrancas ?? [])) cobrancaMap[c.aluno_id] = c.status

  const creditosPorAluno: Record<string, number> = {}
  for (const row of (creditos ?? [])) {
    if (row.credito_valor)
      creditosPorAluno[row.aluno_id] = (creditosPorAluno[row.aluno_id] ?? 0) + Number(row.credito_valor)
  }

  const alunosRel: AlunoRelatorio[] = (alunos ?? []).map(a => {
    const gross = a.modelo_cobranca === 'mensalidade'
      ? Number(a.valor)
      : ((a.horarios ?? []) as { dia: string; horario: string }[])
          .reduce((s, h) => s + (weekdayCounts[h.dia] ?? 0), 0) * Number(a.valor)
    const valorMensal = Math.max(0, gross - (creditosPorAluno[a.id] ?? 0))
    return {
      id: a.id,
      nome: a.nome,
      modelo_cobranca: a.modelo_cobranca,
      valor: Number(a.valor),
      valorMensal,
      horarios: (a.horarios ?? []) as { dia: string; horario: string }[],
      status: (cobrancaMap[a.id] as 'pendente' | 'enviado' | 'pago') ?? null,
      forma_pagamento: a.forma_pagamento,
    }
  })

  const custosRel: CustoRelatorio[] = (custos ?? []).map(c => ({
    nome: c.nome,
    categoria: c.categoria,
    tipo: c.tipo as 'fixo' | 'variavel',
    valor: Number(c.valor),
  }))

  const faturamentoBruto = alunosRel.reduce((s, a) => s + a.valorMensal, 0)
  const totalFixos       = custosRel.filter(c => c.tipo === 'fixo').reduce((s, c) => s + c.valor, 0)
  const totalVariaveis   = custosRel.filter(c => c.tipo === 'variavel').reduce((s, c) => s + c.valor, 0)
  const totalCustos      = totalFixos + totalVariaveis
  const lucroLiquido     = faturamentoBruto - totalCustos
  const margemLucro      = faturamentoBruto > 0 ? Math.round((lucroLiquido / faturamentoBruto) * 100) : 0

  return {
    data: {
      professorNome:  user.user_metadata?.full_name ?? 'Professor',
      professorEmail: user.email ?? '',
      mesRef,
      alunos:         alunosRel,
      custos:         custosRel,
      faturamentoBruto,
      totalFixos,
      totalVariaveis,
      totalCustos,
      lucroLiquido,
      margemLucro,
    },
  }
}

// ── Produtividade Report ──────────────────────────────────────────────────────

export async function getProdutividadeReportData(
  mesRef: string,
): Promise<{ data?: ProdutividadeReportData; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const [yearNum, monthNum] = mesRef.split('-').map(Number)
  const weekdayCounts = countWeekdaysInMonth(yearNum, monthNum - 1)
  const daysInMonth   = new Date(yearNum, monthNum, 0).getDate()
  const mesStart      = `${mesRef}-01`
  const mesEnd        = `${mesRef}-${String(daysInMonth).padStart(2, '0')}`

  const [
    { data: alunos },
    { data: faltas },
    { data: reposicoesPend },
    { data: reposicoesRealizadas },
  ] = await Promise.all([
    supabase.from('alunos')
      .select('id, nome, horarios, duracao')
      .eq('professor_id', user.id)
      .eq('status', 'ativo'),
    supabase.from('faltas')
      .select('aluno_id, culpa, data_falta')
      .eq('professor_id', user.id)
      .gte('data_falta', mesStart)
      .lte('data_falta', mesEnd),
    supabase.from('faltas')
      .select('id, prazo_vencimento')
      .eq('professor_id', user.id)
      .eq('status', 'pendente'),
    supabase.from('eventos_agenda')
      .select('id')
      .eq('professor_id', user.id)
      .eq('tipo', 'reposicao')
      .gte('data_especifica', mesStart)
      .lte('data_especifica', mesEnd),
  ])

  const alunoMap: Record<string, string> = {}
  for (const a of (alunos ?? [])) alunoMap[a.id] = a.nome

  const totalAulasNoMes = (alunos ?? []).reduce((sum, a) => {
    return sum + ((a.horarios ?? []) as { dia: string }[]).reduce((s, h) => s + (weekdayCounts[h.dia] ?? 0), 0)
  }, 0)

  const faltasList = faltas ?? []
  const faltasByAluno: Record<string, number> = {}
  for (const f of faltasList) faltasByAluno[f.aluno_id] = (faltasByAluno[f.aluno_id] ?? 0) + 1
  const faltasPorAluno = Object.entries(faltasByAluno)
    .map(([id, total]) => ({ nome: alunoMap[id] ?? 'Aluno', total }))
    .sort((a, b) => b.total - a.total)

  const today = new Date().toISOString().split('T')[0]
  const pendVencidas = (reposicoesPend ?? []).filter(f => f.prazo_vencimento && f.prazo_vencimento < today).length
  const pendAtivas   = (reposicoesPend ?? []).length - pendVencidas

  const horasTrabalhadas = (alunos ?? []).reduce((sum, a) => {
    const aulas = ((a.horarios ?? []) as { dia: string }[]).reduce((s, h) => s + (weekdayCounts[h.dia] ?? 0), 0)
    return sum + aulas * ((a.duracao ?? 60) / 60)
  }, 0)

  // Count working days (Mon-Fri) in month
  let workingDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(yearNum, monthNum - 1, d).getDay()
    if (dow >= 1 && dow <= 5) workingDays++
  }
  const mediaAulasPorDia = workingDays > 0 ? Math.round((totalAulasNoMes / workingDays) * 10) / 10 : 0

  // Day with most classes
  const aulasPorDia: Record<string, number> = {}
  for (const a of (alunos ?? []))
    for (const h of (a.horarios ?? []) as { dia: string }[])
      aulasPorDia[h.dia] = (aulasPorDia[h.dia] ?? 0) + (weekdayCounts[h.dia] ?? 0)
  const topDia = Object.entries(aulasPorDia).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  const diasPt: Record<string, string> = {
    seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira',
    qui: 'Quinta-feira', sex: 'Sexta-feira', sab: 'Sábado', dom: 'Domingo',
  }

  return {
    data: {
      mesRef,
      totalAlunosAtivos:    (alunos ?? []).length,
      totalAulasNoMes,
      totalFaltas:          faltasList.length,
      faltasPorAluno,
      faltasCulpaAluno:     faltasList.filter(f => f.culpa === 'aluno').length,
      faltasCulpaProfessor: faltasList.filter(f => f.culpa === 'professor').length,
      reposicoesRealizadas: (reposicoesRealizadas ?? []).length,
      reposicoesPendentes:  pendAtivas,
      reposicoesVencidas:   pendVencidas,
      horasTrabalhadas:     Math.round(horasTrabalhadas * 10) / 10,
      mediaAulasPorDia,
      alunoMaisFaltas:      faltasPorAluno[0]?.nome ?? '—',
      diaMaisCheio:         diasPt[topDia] ?? (topDia || '—'),
    },
  }
}

// ── Previsão Report ───────────────────────────────────────────────────────────

export async function getPrevisaoReportData(): Promise<{ data?: PrevisaoReportData; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const now      = new Date()
  const curYear  = now.getFullYear()
  const curMonth = now.getMonth()
  const mesAtual = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`

  const [
    { data: alunos },
    { data: fixosRoots },
    { data: metaRow },
  ] = await Promise.all([
    supabase.from('alunos')
      .select('id, horarios, modelo_cobranca, valor')
      .eq('professor_id', user.id)
      .eq('status', 'ativo'),
    supabase.from('custos')
      .select('valor')
      .eq('professor_id', user.id)
      .eq('tipo', 'fixo')
      .or('ativo.is.null,ativo.eq.true')
      .is('origem_id', null),
    supabase.from('metas')
      .select('meta_mensal')
      .eq('professor_id', user.id)
      .maybeSingle(),
  ])

  const alunosList    = alunos ?? []
  const totalFixosMes = (fixosRoots ?? []).reduce((s, c) => s + Number(c.valor), 0)

  function calcFat(year: number, month: number) {
    const wc = countWeekdaysInMonth(year, month)
    return alunosList.reduce((sum, a) => {
      if (a.modelo_cobranca === 'mensalidade') return sum + Number(a.valor)
      const aulas = ((a.horarios ?? []) as { dia: string }[]).reduce((s, h) => s + (wc[h.dia] ?? 0), 0)
      return sum + aulas * Number(a.valor)
    }, 0)
  }

  const faturamentoAtual = calcFat(curYear, curMonth)

  const meses: PrevisaoMes[] = []
  for (let i = 0; i < 4; i++) {
    const d   = new Date(curYear, curMonth + i, 1)
    const y   = d.getFullYear()
    const m   = d.getMonth()
    const ref = `${y}-${String(m + 1).padStart(2, '0')}`
    const fat = calcFat(y, m)
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    meses.push({
      mesRef: ref,
      label:  label.charAt(0).toUpperCase() + label.slice(1),
      faturamentoPrevisto: fat,
      custosPrevisto:      totalFixosMes,
      lucroPrevisto:       fat - totalFixosMes,
    })
  }

  const ticketMedio = alunosList.length > 0 ? Math.round(faturamentoAtual / alunosList.length) : 0
  const nextFat     = meses[1]?.faturamentoPrevisto ?? faturamentoAtual
  const atual       = nextFat - totalFixosMes
  const pessimista  = Math.max(0, nextFat - 2 * ticketMedio - totalFixosMes)
  const otimista    = nextFat + 2 * ticketMedio - totalFixosMes
  const metaLucro   = Number(metaRow?.meta_mensal ?? 0)
  const alunosNecessarios = ticketMedio > 0 && metaLucro > atual
    ? Math.ceil((metaLucro - atual) / ticketMedio)
    : 0

  return {
    data: {
      mesAtual,
      faturamentoAtual,
      meses,
      ticketMedio,
      pessimista,
      atual,
      otimista,
      metaLucro,
      alunosNecessarios,
    },
  }
}
