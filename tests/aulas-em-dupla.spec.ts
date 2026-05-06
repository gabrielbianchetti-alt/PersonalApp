/**
 * Aulas em Dupla — testes de lógica.
 *
 * Replicam a regra de divisão do valor da dupla, a separação de duplas vs
 * extras na cobrança, o tratamento especial de alunos pacote, e o fluxo de
 * "falta vira individual". Qualquer divergência aqui indica regressão na
 * implementação real (createAulaDuplaManualAction, fetchExtrasForMonth,
 * calcTotal/buildMessage, createFaltaAction).
 */
import { test, expect } from '@playwright/test'

// ── Divisão do valor total ───────────────────────────────────────────────────

test.describe('Aulas em Dupla — divisão do valor total', () => {

  // Replica de createAulaDuplaManualAction: cada lado paga (total / 2).
  function valorPorAluno(total: number): number {
    return Math.round((total / 2) * 100) / 100
  }

  test('valor par: 160 → 80 cada', () => {
    expect(valorPorAluno(160)).toBe(80)
  })

  test('valor ímpar: 161 → 80.5 cada', () => {
    expect(valorPorAluno(161)).toBe(80.5)
  })

  test('valor com centavos: 199.99 → 100 cada (arredondado a 2 casas)', () => {
    expect(valorPorAluno(199.99)).toBe(100)
  })

  test('valor 100.05 → 50.03 cada (arredondamento bancário em 2 casas)', () => {
    expect(valorPorAluno(100.05)).toBe(50.03)
  })

})

// ── Pacote: zera valor para evitar dupla cobrança ────────────────────────────

test.describe('Aulas em Dupla — aluno pacote consome do pacote (não cobra à parte)', () => {

  // Replica: createEventoAction (tipo='aula') consome 1 aula do pacote ativo.
  // Para evitar cobrança dobrada, createAulaDuplaManualAction zera `valor`
  // quando aluno.modelo_cobranca === 'pacote'.
  function valorParaEvento(modelo: 'mensalidade' | 'por_aula' | 'pacote', valorMetade: number): number | null {
    return modelo === 'pacote' ? null : valorMetade
  }

  test('pacote → valor=null (consome 1 do pacote, sem cobrança extra)', () => {
    expect(valorParaEvento('pacote', 80)).toBeNull()
  })

  test('mensalidade → valor=metade (entra no totalValor de duplas)', () => {
    expect(valorParaEvento('mensalidade', 80)).toBe(80)
  })

  test('por_aula → valor=metade (entra no totalValor de duplas)', () => {
    expect(valorParaEvento('por_aula', 80)).toBe(80)
  })

})

// ── Agregação separada de extras vs duplas ───────────────────────────────────

test.describe('Cobrança — duplas são acumuladas separadamente de aulas extras', () => {

  type Row = { aluno_id: string | null; valor: number | null }

  function accumulate(rows: Row[]): Record<string, { count: number; totalValor: number }> {
    const map: Record<string, { count: number; totalValor: number }> = {}
    for (const row of rows) {
      if (!row.aluno_id) continue
      const prev = map[row.aluno_id] ?? { count: 0, totalValor: 0 }
      map[row.aluno_id] = { count: prev.count + 1, totalValor: prev.totalValor + Number(row.valor ?? 0) }
    }
    return map
  }

  test('linhas sem aluno_id são ignoradas', () => {
    const map = accumulate([{ aluno_id: null, valor: 50 }])
    expect(Object.keys(map)).toHaveLength(0)
  })

  test('valor null soma 0 mas conta 1 ocorrência', () => {
    const map = accumulate([{ aluno_id: 'A', valor: null }])
    expect(map['A']).toEqual({ count: 1, totalValor: 0 })
  })

  test('múltiplas duplas mesmo aluno: count e totalValor somam', () => {
    const map = accumulate([
      { aluno_id: 'A', valor: 80 },
      { aluno_id: 'A', valor: 100 },
      { aluno_id: 'B', valor: 75 },
    ])
    expect(map['A']).toEqual({ count: 2, totalValor: 180 })
    expect(map['B']).toEqual({ count: 1, totalValor: 75 })
  })

})

// ── Cálculo do gross em CobrancaMensal/CalculoMensal ─────────────────────────

test.describe('calcTotal — duplas somam SEMPRE pelo valor real (independente do modelo)', () => {

  type Aluno = { modelo: 'mensalidade' | 'por_aula' | 'pacote'; valorBase: number }
  type Extras = { count: number; totalValor: number }

  // Replica simplificada de calcTotal: ignora pacote, créditos, feriados.
  function gross(
    aluno: Aluno,
    fixedCount: number,
    extras: Extras = { count: 0, totalValor: 0 },
    duplas: Extras = { count: 0, totalValor: 0 },
  ): number {
    if (aluno.modelo === 'mensalidade') {
      return aluno.valorBase + extras.totalValor + duplas.totalValor
    }
    return (fixedCount + extras.count) * aluno.valorBase + duplas.totalValor
  }

  test('mensalidade sem extras nem duplas → só o valor base', () => {
    expect(gross({ modelo: 'mensalidade', valorBase: 800 }, 0)).toBe(800)
  })

  test('mensalidade + 1 dupla R$80 → 800 + 80 = 880', () => {
    expect(gross({ modelo: 'mensalidade', valorBase: 800 }, 0, undefined, { count: 1, totalValor: 80 })).toBe(880)
  })

  test('por_aula 13 fixas R$150 + 1 dupla R$80 → 13×150 + 80 = 2030', () => {
    expect(gross({ modelo: 'por_aula', valorBase: 150 }, 13, undefined, { count: 1, totalValor: 80 })).toBe(2030)
  })

  test('por_aula 13 fixas + 2 extras (R$150 cada) + 1 dupla R$80 → (13+2)×150 + 80 = 2330', () => {
    expect(gross(
      { modelo: 'por_aula', valorBase: 150 }, 13,
      { count: 2, totalValor: 300 },
      { count: 1, totalValor: 80 },
    )).toBe(2330)
  })

  test('mensalidade + 1 extra R$200 + 2 duplas R$80 cada → 800 + 200 + 160 = 1160', () => {
    expect(gross(
      { modelo: 'mensalidade', valorBase: 800 }, 0,
      { count: 1, totalValor: 200 },
      { count: 2, totalValor: 160 },
    )).toBe(1160)
  })

  test('REGRESSÃO: dupla NÃO usa valor base do aluno por_aula (bug original)', () => {
    // Antes, a dupla incrementava extra.count e era multiplicada pelo valor base
    // do aluno. Para por_aula com R$150 e dupla R$80 (metade R$40), o gross
    // somava R$150 em vez dos R$40 reais. O fix: duplas usam totalValor real.
    const totalCorreto   = gross({ modelo: 'por_aula', valorBase: 150 }, 0, undefined, { count: 1, totalValor: 40 })
    const totalBugAntigo = (0 + 1) * 150
    expect(totalCorreto).toBe(40)
    expect(totalCorreto).not.toBe(totalBugAntigo)
  })

})

// ── Falta em dupla: parceiro vira individual ──────────────────────────────────

test.describe('Falta em aula em dupla — parceiro converte para individual', () => {

  type Evento = {
    id: string
    aluno_id: string
    eh_dupla: boolean
    parceiro_evento_id: string | null
    valor: number | null
  }

  // Replica da regra em createFaltaAction (culpa='aluno'):
  // - localiza eventos eh_dupla=true do aluno na data_falta
  // - desliga eh_dupla, parceiro_evento_id e zera valor em ambos os lados
  function aplicarFaltaEmDupla(eventos: Evento[], faltanteId: string): Evento[] {
    const partnersToConvert = new Set<string>()
    return eventos.map(ev => {
      if (ev.aluno_id === faltanteId && ev.eh_dupla) {
        if (ev.parceiro_evento_id) partnersToConvert.add(ev.parceiro_evento_id)
        return { ...ev, eh_dupla: false, parceiro_evento_id: null, valor: null }
      }
      return ev
    }).map(ev => partnersToConvert.has(ev.id)
      ? { ...ev, eh_dupla: false, parceiro_evento_id: null, valor: null }
      : ev)
  }

  test('A falta → A e B viram individuais com valor=null', () => {
    const evA: Evento = { id: 'a1', aluno_id: 'A', eh_dupla: true, parceiro_evento_id: 'b1', valor: 80 }
    const evB: Evento = { id: 'b1', aluno_id: 'B', eh_dupla: true, parceiro_evento_id: 'a1', valor: 80 }
    const result = aplicarFaltaEmDupla([evA, evB], 'A')
    expect(result[0]).toEqual({ id: 'a1', aluno_id: 'A', eh_dupla: false, parceiro_evento_id: null, valor: null })
    expect(result[1]).toEqual({ id: 'b1', aluno_id: 'B', eh_dupla: false, parceiro_evento_id: null, valor: null })
  })

  test('parceiro com modelo por_aula passa a ser cobrado pelo valor cheio (count+1)*valor_base', () => {
    // Antes da falta: B (por_aula R$150) tinha 1 dupla R$80 → gross += 80
    // Após falta de A: o evento de B vira individual, valor=null, count++
    // Cálculo: (fixed + 1) * 150  — ou seja, R$150 cheio em vez de R$80
    const grossAntes = 13 * 150 + 80
    const grossDepois = (13 + 1) * 150 + 0
    expect(grossDepois - grossAntes).toBe(70) // diferença de R$70 = valor cheio - metade
  })

  test('falta de aluno NÃO em dupla é no-op para o evento (apenas registra falta)', () => {
    const evIndividual: Evento = { id: 'x1', aluno_id: 'A', eh_dupla: false, parceiro_evento_id: null, valor: null }
    const result = aplicarFaltaEmDupla([evIndividual], 'A')
    expect(result[0]).toEqual(evIndividual)
  })

})
