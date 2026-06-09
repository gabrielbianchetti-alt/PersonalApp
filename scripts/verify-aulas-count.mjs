// ──────────────────────────────────────────────────────────────────────────────
// Verificação da Fatia 6 — fonte única da conta de aulas.
//
// Reimplementa a lógica ANTIGA (Cálculo e Cobrança, cada um do seu jeito) e a
// lógica NOVA (src/lib/utils/aulas.ts, copiada aqui 1:1) e compara o resultado
// numérico em uma matriz de casos. Não muda nada; só prova que o total não
// mudou. Rode com:  node scripts/verify-aulas-count.mjs
// ──────────────────────────────────────────────────────────────────────────────

const DOW_TO_KEY = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab', 0: 'dom' }
const DOW_ISO    = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

function diaSemanaKey(iso) { return DOW_ISO[new Date(iso + 'T12:00:00').getDay()] }

function countWeekdaysInMonth(year, month) {
  const c = { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0, dom: 0 }
  const days = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= days; d++) { const k = DOW_TO_KEY[new Date(year, month, d).getDay()]; if (k) c[k]++ }
  return c
}

// ── NOVO (espelho exato de src/lib/utils/aulas.ts) ────────────────────────────
function buildFeriadoSkipDays(feriados, decisoes) {
  const skip = new Set()
  for (const f of feriados) if (decisoes[f] !== true) skip.add(parseInt(f.split('-')[2], 10))
  return skip
}
function aulasPrevistasDatas(horarios, year, month, skip) {
  const days = new Date(year, month + 1, 0).getDate()
  const dias = horarios.map(h => h.dia)
  const dates = []
  for (let d = 1; d <= days; d++) {
    if (skip && skip.has(d)) continue
    const k = DOW_TO_KEY[new Date(year, month, d).getDay()]
    if (k && dias.includes(k)) dates.push(d)
  }
  return dates
}
function aulasACobrar(aluno, ctx) {
  const prev = aulasPrevistasDatas(aluno.horarios, ctx.year, ctx.month, ctx.skipDays).length
  const calc = prev + (ctx.extras?.count ?? 0)
  return ctx.ajusteAulas ?? calc
}
function totalBrutoAluno(aluno, ctx) {
  const dup = ctx.duplas?.totalValor ?? 0
  if (aluno.modelo_cobranca === 'pacote') return ctx.pacoteValor ? Number(ctx.pacoteValor) : 0
  if (aluno.modelo_cobranca === 'mensalidade') return Number(aluno.valor) + (ctx.extras?.totalValor ?? 0) + dup
  return aulasACobrar(aluno, ctx) * Number(aluno.valor) + dup
}

// ── ANTIGO: Cálculo (countWeekdays - feriados) ────────────────────────────────
function old_calc_fixed(aluno, year, month, feriados, decisoes) {
  if (aluno.modelo_cobranca === 'mensalidade' || aluno.modelo_cobranca === 'pacote') return 0
  const wc = countWeekdaysInMonth(year, month)
  let total = aluno.horarios.reduce((s, h) => s + (wc[h.dia] ?? 0), 0)
  for (const f of feriados) {
    if (decisoes[f] === true) continue
    const k = diaSemanaKey(f)
    if (aluno.horarios.some(h => h.dia === k)) total -= 1
  }
  return Math.max(0, total)
}
function old_calc_total(aluno, year, month, feriados, decisoes, extras, duplas, adj, pacoteValor) {
  if (aluno.modelo_cobranca === 'pacote') return pacoteValor ? Number(pacoteValor) : 0
  const dup = duplas?.totalValor ?? 0
  if (aluno.modelo_cobranca === 'mensalidade') return Number(aluno.valor) + (extras?.totalValor ?? 0) + dup
  const calc  = old_calc_fixed(aluno, year, month, feriados, decisoes) + (extras?.count ?? 0)
  const aulas = adj ?? calc
  return aulas * Number(aluno.valor) + dup
}

// ── ANTIGO: Cobrança (getAulasDates dia-a-dia) ────────────────────────────────
function old_cob_dates(horarios, year, month, skip) {
  const days = new Date(year, month + 1, 0).getDate()
  const dias = horarios.map(h => h.dia)
  const dates = []
  for (let d = 1; d <= days; d++) {
    if (skip && skip.has(d)) continue
    const k = DOW_TO_KEY[new Date(year, month, d).getDay()]
    if (k && dias.includes(k)) dates.push(d)
  }
  return dates
}
function old_cob_total(aluno, year, month, skip, extras, duplas, credito, pacoteValor) {
  if (aluno.modelo_cobranca === 'pacote') return pacoteValor ? Number(pacoteValor) : 0
  const dup = duplas?.totalValor ?? 0
  const gross = aluno.modelo_cobranca === 'mensalidade'
    ? Number(aluno.valor) + (extras?.totalValor ?? 0) + dup
    : (old_cob_dates(aluno.horarios, year, month, skip).length + (extras?.count ?? 0)) * Number(aluno.valor) + dup
  return Math.max(0, gross - (credito ?? 0))
}

// ── Matriz de casos ───────────────────────────────────────────────────────────
const HORARIOS_SETS = [
  [{ dia: 'seg' }, { dia: 'qua' }, { dia: 'sex' }],
  [{ dia: 'ter' }, { dia: 'qui' }],
  [{ dia: 'sab' }],
  [{ dia: 'seg' }, { dia: 'ter' }, { dia: 'qua' }, { dia: 'qui' }, { dia: 'sex' }],
]
const MESES = [[2026, 0], [2026, 1], [2026, 3], [2025, 11], [2024, 1]] // inclui jan, carnaval-ish, abril, dez, fev bissexto
// Feriados de teste por mês (datas reais aproximadas; o que importa é a equivalência)
const FERIADOS = {
  '2026-0':  ['2026-01-01'],
  '2026-1':  ['2026-02-16', '2026-02-17'],
  '2026-3':  ['2026-04-21'],
  '2025-11': ['2025-12-25'],
  '2024-1':  ['2024-02-12', '2024-02-13'],
}
const EXTRAS = [undefined, { count: 2, totalValor: 160 }]
const DUPLAS = [undefined, { count: 1, totalValor: 45 }]
const ADJ    = [undefined, 0, 7]
const CRED   = [0, 50]
const MODELOS = ['por_aula', 'mensalidade', 'pacote']

let cases = 0, fails = 0
function approx(a, b) { return Math.abs(a - b) < 0.005 }

for (const [year, month] of MESES) {
  const feriados = FERIADOS[`${year}-${month}`] ?? []
  for (const decisoesMode of ['nenhum', 'todos_dar']) {
    const decisoes = {}
    if (decisoesMode === 'todos_dar') for (const f of feriados) decisoes[f] = true
    const skip = buildFeriadoSkipDays(feriados, decisoes)
    for (const horarios of HORARIOS_SETS) {
      for (const modelo of MODELOS) {
        for (const extras of EXTRAS) for (const duplas of DUPLAS) for (const adj of ADJ) for (const cred of CRED) {
          const aluno = { modelo_cobranca: modelo, horarios, valor: 80 }
          const pacoteValor = modelo === 'pacote' ? 600 : null
          cases++

          // 1) previstas: Cálculo antigo == Cobrança antiga == novo
          if (modelo === 'por_aula') {
            const newPrev = aulasPrevistasDatas(horarios, year, month, skip).length
            const oldCalc = old_calc_fixed(aluno, year, month, feriados, decisoes)
            const oldCob  = old_cob_dates(horarios, year, month, skip).length
            if (newPrev !== oldCalc || newPrev !== oldCob) {
              fails++; console.log(`PREV mismatch ${year}-${month} ${JSON.stringify(horarios)}: new=${newPrev} oldCalc=${oldCalc} oldCob=${oldCob}`)
            }
          }

          // 2) total Cálculo (sem crédito): novo == antigo
          const newCalcTotal = totalBrutoAluno(aluno, { year, month, skipDays: skip, extras, duplas, ajusteAulas: adj, pacoteValor })
          const oldCalcTotal = old_calc_total(aluno, year, month, feriados, decisoes, extras, duplas, adj, pacoteValor)
          if (!approx(newCalcTotal, oldCalcTotal)) {
            fails++; console.log(`CALC TOTAL mismatch ${modelo} ${year}-${month}: new=${newCalcTotal} old=${oldCalcTotal}`)
          }

          // 3) total Cobrança (com crédito, sem ajuste manual): novo == antigo
          const newCobTotal = (() => {
            const bruto = totalBrutoAluno(aluno, { year, month, skipDays: skip, extras, duplas, pacoteValor })
            return modelo === 'pacote' ? bruto : Math.max(0, bruto - cred)
          })()
          const oldCobTotal = old_cob_total(aluno, year, month, skip, extras, duplas, cred, pacoteValor)
          if (!approx(newCobTotal, oldCobTotal)) {
            fails++; console.log(`COB TOTAL mismatch ${modelo} ${year}-${month} cred=${cred}: new=${newCobTotal} old=${oldCobTotal}`)
          }
        }
      }
    }
  }
}

console.log(`\n${cases} casos verificados, ${fails} divergências.`)
if (fails > 0) process.exit(1)
console.log('OK — a fonte única reproduz exatamente Cálculo e Cobrança antigos.')
