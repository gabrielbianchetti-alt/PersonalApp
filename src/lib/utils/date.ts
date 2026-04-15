// ─── Shared date/calendar utilities ──────────────────────────────────────────
// Used across: dashboard/page.tsx, relatorios/actions.ts, calculo/CalculoMensal.tsx

/** Maps getDay() result (0=Sun, 1=Mon, ..., 6=Sat) to Portuguese day keys */
export const DOW_TO_KEY: Record<number, string> = {
  1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab', 0: 'dom',
}

/**
 * Counts how many times each weekday occurs in a given month.
 * @param year  Full year (e.g. 2025)
 * @param month 0-indexed month (0 = January)
 */
export function countWeekdaysInMonth(year: number, month: number): Record<string, number> {
  const counts: Record<string, number> = { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0, dom: 0 }
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const key = DOW_TO_KEY[new Date(year, month, d).getDay()]
    if (key) counts[key]++
  }
  return counts
}

/**
 * Formats a Date as "YYYY-MM-DD" string.
 */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
