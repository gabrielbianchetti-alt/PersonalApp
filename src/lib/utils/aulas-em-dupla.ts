import type { ModeloCobranca } from '@/types/aluno'

export interface AlunoExtrasAgg { count: number; totalValor: number }

export function dividirValorDupla(valorTotal: number): number {
  return Math.round((valorTotal / 2) * 100) / 100
}

/**
 * Aluno pacote: createEventoAction (tipo='aula') consome 1 do pacote ativo
 * automaticamente, então o valor é zerado para evitar dupla cobrança no
 * agregador de cobrança. Mensalidade/por_aula recebem o valor da metade.
 */
export function valorEventoDupla(modelo: ModeloCobranca, valorMetade: number): number | null {
  return modelo === 'pacote' ? null : valorMetade
}

export function accumulateEventsByAluno(
  rows: Array<{ aluno_id: string | null; valor: number | null }> | null | undefined,
): Record<string, AlunoExtrasAgg> {
  const map: Record<string, AlunoExtrasAgg> = {}
  for (const row of (rows ?? [])) {
    if (!row.aluno_id) continue
    const prev = map[row.aluno_id] ?? { count: 0, totalValor: 0 }
    map[row.aluno_id] = { count: prev.count + 1, totalValor: prev.totalValor + Number(row.valor ?? 0) }
  }
  return map
}
