/**
 * Feriados nacionais brasileiros (fixos + móveis).
 *
 * Feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi) são
 * calculados a partir do domingo de Páscoa via algoritmo de Gauss/Meeus.
 */

export interface Feriado {
  data: string          // YYYY-MM-DD
  nome: string
  /** true = fixo (mesma data todo ano), false = móvel */
  fixo: boolean
}

// ─── Cálculo do Domingo de Páscoa (algoritmo de Meeus) ───────────────────────
function computePaschoa(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)   // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Lista completa de feriados do ano ───────────────────────────────────────
export function getFeriadosAno(year: number): Feriado[] {
  const paschoa = computePaschoa(year)

  // Móveis
  const carnavalTer  = addDays(paschoa, -47)   // terça de carnaval
  const carnavalSeg  = addDays(paschoa, -48)   // segunda de carnaval
  const sextaSanta   = addDays(paschoa, -2)
  const corpusXpt    = addDays(paschoa,  60)

  const feriados: Feriado[] = [
    // Fixos
    { data: `${year}-01-01`, nome: 'Confraternização Universal', fixo: true },
    { data: `${year}-04-21`, nome: 'Tiradentes',                 fixo: true },
    { data: `${year}-05-01`, nome: 'Dia do Trabalho',            fixo: true },
    { data: `${year}-09-07`, nome: 'Independência',              fixo: true },
    { data: `${year}-10-12`, nome: 'Nossa Senhora Aparecida',    fixo: true },
    { data: `${year}-11-02`, nome: 'Finados',                    fixo: true },
    { data: `${year}-11-15`, nome: 'Proclamação da República',   fixo: true },
    { data: `${year}-12-25`, nome: 'Natal',                      fixo: true },

    // Móveis
    { data: isoDate(carnavalSeg),  nome: 'Carnaval (segunda)', fixo: false },
    { data: isoDate(carnavalTer),  nome: 'Carnaval (terça)',   fixo: false },
    { data: isoDate(sextaSanta),   nome: 'Sexta-feira Santa',  fixo: false },
    { data: isoDate(corpusXpt),    nome: 'Corpus Christi',     fixo: false },
  ]

  return feriados.sort((a, b) => a.data.localeCompare(b.data))
}

// ─── Cache em memória (mesmo ano → mesma lista) ──────────────────────────────
const cache = new Map<number, Feriado[]>()
export function getFeriadosAnoCached(year: number): Feriado[] {
  let list = cache.get(year)
  if (!list) { list = getFeriadosAno(year); cache.set(year, list) }
  return list
}

// ─── Helpers de data pontuais ────────────────────────────────────────────────

/** Retorna o feriado (se houver) na data ISO informada */
export function feriadoEmData(iso: string): Feriado | null {
  if (!iso || iso.length < 10) return null
  const year = parseInt(iso.slice(0, 4))
  if (isNaN(year)) return null
  return getFeriadosAnoCached(year).find(f => f.data === iso) ?? null
}

/** Feriados de um mês específico ("YYYY-MM") */
export function getFeriadosDoMes(mesRef: string): Feriado[] {
  const [y, m] = mesRef.split('-').map(Number)
  if (!y || !m) return []
  const prefix = `${y}-${String(m).padStart(2, '0')}-`
  return getFeriadosAnoCached(y).filter(f => f.data.startsWith(prefix))
}

// ─── Dia da semana (chave) ───────────────────────────────────────────────────
const DOW_TO_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
export function diaSemanaKey(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return DOW_TO_KEY[d.getDay()]
}

const DOW_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export function diaSemanaLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return DOW_LABEL[d.getDay()]
}

/** Formata "DD/MM" */
export function formatDM(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
