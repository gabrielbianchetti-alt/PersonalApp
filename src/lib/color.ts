/** Parse #RRGGBB → [r, g, b] */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0')
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ]
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

export function darkenHex(hex: string, amount = 25): string {
  const [r, g, b] = hexToRgb(hex)
  const c = (n: number) => Math.max(0, Math.min(255, n - amount))
  return '#' + [r, g, b].map(x => c(x).toString(16).padStart(2, '0')).join('')
}

/**
 * CSS string for a <style> tag injected server-side.
 * Only overrides ACCENT COLOR variables — dark/light switching is handled
 * entirely by globals.css via html[data-theme="claro"] attribute selectors,
 * which are matched by applyModo() and the root layout's data-theme attribute.
 * Returns null when accent is the default green (nothing to inject).
 */
export function themeStyle(cor: string): string | null {
  if (cor === '#00E676') return null          // default accent — nothing to inject
  const [r, g, b] = hexToRgb(cor)
  return `:root{--green-primary:${cor};--green-hover:${darkenHex(cor, 25)};--green-muted:rgba(${r},${g},${b},0.08);--border-focus:rgba(${r},${g},${b},0.5)}`
}

/** Apply accent-color CSS variables at runtime — client-only */
export function applyTheme(cor: string): void {
  const [r, g, b] = hexToRgb(cor)
  const root = document.documentElement
  root.style.setProperty('--green-primary', cor)
  root.style.setProperty('--green-hover', darkenHex(cor, 25))
  root.style.setProperty('--green-muted', `rgba(${r},${g},${b},0.08)`)
  root.style.setProperty('--border-focus', `rgba(${r},${g},${b},0.5)`)
}

/**
 * Apply light/dark/auto mode at runtime — client-only.
 * Sets data-theme on <html>; globals.css selectors do the rest.
 *   escuro → dark defaults (:root)
 *   claro  → html[data-theme="claro"] override
 *   auto   → html[data-theme="auto"] + @media(prefers-color-scheme:light)
 */
export function applyModo(modo: 'escuro' | 'claro' | 'auto'): void {
  document.documentElement.setAttribute('data-theme', modo)
}
