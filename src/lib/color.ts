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

// Light mode CSS variable values — must mirror globals.css
const LIGHT_VARS = '--bg-base:#F5F5F5;--bg-surface:#FFFFFF;--bg-card:#FFFFFF;--bg-input:#FFFFFF;--border-subtle:#E5E7EB;--text-primary:#1A1A2E;--text-secondary:#6B7280;--text-muted:#9CA3AF'

/**
 * CSS string to inject in a <style> tag — server-safe.
 * Outputs accent-color vars and, for light/auto modes, the full light-theme vars.
 * This prevents flash on SSR: the style tag is applied before JS hydrates.
 */
export function themeStyle(cor: string, modo: 'escuro' | 'claro' | 'auto' = 'escuro'): string | null {
  const isDefaultAccent = cor === '#00E676'
  const [r, g, b] = hexToRgb(cor)
  const accent = `--green-primary:${cor};--green-hover:${darkenHex(cor, 25)};--green-muted:rgba(${r},${g},${b},0.08);--border-focus:rgba(${r},${g},${b},0.5)`

  if (modo === 'claro') {
    // Always inject for light mode regardless of accent color
    return `:root{${accent};${LIGHT_VARS}}`
  }

  if (modo === 'auto') {
    const base = isDefaultAccent ? '' : `:root{${accent}}`
    return `${base}@media(prefers-color-scheme:light){:root{${isDefaultAccent ? '' : accent + ';'}${LIGHT_VARS}}}`
      .replace('{}', '') || null
  }

  // Dark mode: only inject if accent color differs from default
  if (isDefaultAccent) return null
  return `:root{${accent}}`
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

/** Apply light/dark/auto mode at runtime — client-only */
export function applyModo(modo: 'escuro' | 'claro' | 'auto'): void {
  document.documentElement.setAttribute('data-theme', modo)
}
