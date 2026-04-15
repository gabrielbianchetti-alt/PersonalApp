/**
 * LogoFull — PH icon + "Personalhub" wordmark side by side.
 *
 * Props:
 *  iconSize  — height of the icon in px  (default 28)
 *  fontSize  — wordmark font size in px   (default 16)
 *  variant   — "theme" | "brand"          (default "theme")
 *  gap       — gap between icon and text  (default 8)
 */

import { LogoIcon } from './LogoIcon'

interface LogoFullProps {
  iconSize?: number
  fontSize?: number
  variant?: 'theme' | 'brand'
  gap?: number
  className?: string
}

export function LogoFull({
  iconSize = 28,
  fontSize = 16,
  variant = 'theme',
  gap = 8,
  className,
}: LogoFullProps) {
  const textColor = variant === 'brand' ? '#0f172a' : 'var(--text-primary)'
  const accentColor = variant === 'brand' ? '#2D5432' : 'var(--green-primary)'

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap }}
    >
      <LogoIcon size={iconSize} variant={variant} />
      <span
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: -0.3,
          color: textColor,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Personal<span style={{ color: accentColor }}>hub</span>
      </span>
    </div>
  )
}
