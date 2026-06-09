// ──────────────────────────────────────────────────────────────────────────────
// Fonte única da conta de aulas (Fatia 6).
//
// Tanto o Cálculo Mensal quanto a Cobrança consomem ESTAS funções, em vez de
// cada um contar do seu jeito. Fórmula:
//
//   aulas a cobrar = previstas (dias do mês ∖ feriados pulados) + extras ± ajuste
//   total bruto    = aulas a cobrar × valor  (por_aula)
//                    valor + extras + duplas (mensalidade)
//                    valor do pacote do mês  (pacote)
//
// O crédito (desconto em dinheiro) NÃO entra aqui — é aplicado por quem consome
// (só a Cobrança), porque o Cálculo exibe o faturamento bruto.
// ──────────────────────────────────────────────────────────────────────────────

import { getFeriadosDoMes } from './feriados'

const GETDAY_TO_KEY: Record<number, string> = {
  1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab', 0: 'dom',
}

export interface AulaHorario { dia: string; horario?: string }
export interface ExtrasAgg { count: number; totalValor: number }

/**
 * Dias do mês (1..N) a pular no cálculo: feriados em que o professor NÃO marcou
 * dar aula (decisoes[data] !== true). Mesma regra que Cálculo e Cobrança já
 * usavam separadamente.
 */
export function buildFeriadoSkipDays(
  mesRef: string,
  decisoes: Record<string, boolean>,
): Set<number> {
  const skip = new Set<number>()
  for (const f of getFeriadosDoMes(mesRef)) {
    if (decisoes[f.data] !== true) skip.add(parseInt(f.data.split('-')[2], 10))
  }
  return skip
}

/**
 * Datas (dia do mês) das aulas fixas previstas no mês para os horários do aluno,
 * excluindo os feriados pulados. A Cobrança usa a lista (para a mensagem); o
 * Cálculo usa só o tamanho.
 */
export function aulasPrevistasDatas(
  horarios: AulaHorario[],
  year: number,
  month: number,            // 0-based
  skipDays?: Set<number>,
): number[] {
  const days = new Date(year, month + 1, 0).getDate()
  const dias = horarios.map(h => h.dia)
  const dates: number[] = []
  for (let d = 1; d <= days; d++) {
    if (skipDays?.has(d)) continue
    const key = GETDAY_TO_KEY[new Date(year, month, d).getDay()]
    if (key && dias.includes(key)) dates.push(d)
  }
  return dates
}

export interface AlunoConta {
  modelo_cobranca: string
  horarios: AulaHorario[]
  valor: number
}

export interface ContaCtx {
  year: number
  month: number             // 0-based
  skipDays?: Set<number>
  extras?: ExtrasAgg
  duplas?: ExtrasAgg
  /** Ajuste manual da contagem (override absoluto). undefined = usa o calculado. */
  ajusteAulas?: number
  /** Valor do pacote do mês (modelo pacote). */
  pacoteValor?: number | null
}

/**
 * Aulas a cobrar no modelo por_aula: previstas + extras, respeitando o ajuste
 * manual quando presente. (Mensalidade/pacote não usam esta contagem no total.)
 */
export function aulasACobrar(aluno: AlunoConta, ctx: ContaCtx): number {
  const previstas = aulasPrevistasDatas(aluno.horarios, ctx.year, ctx.month, ctx.skipDays).length
  const calc = previstas + (ctx.extras?.count ?? 0)
  return ctx.ajusteAulas ?? calc
}

/**
 * Total BRUTO do aluno no mês (sem desconto de crédito). Fonte única consumida
 * por Cálculo e Cobrança. Duplas entram sempre pelo valor real (metade), fora da
 * multiplicação contagem × valor.
 */
export function totalBrutoAluno(aluno: AlunoConta, ctx: ContaCtx): number {
  const duplasTotal = ctx.duplas?.totalValor ?? 0
  if (aluno.modelo_cobranca === 'pacote') {
    return ctx.pacoteValor ? Number(ctx.pacoteValor) : 0
  }
  if (aluno.modelo_cobranca === 'mensalidade') {
    return Number(aluno.valor) + (ctx.extras?.totalValor ?? 0) + duplasTotal
  }
  return aulasACobrar(aluno, ctx) * Number(aluno.valor) + duplasTotal
}
