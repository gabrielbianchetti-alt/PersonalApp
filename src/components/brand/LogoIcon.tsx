/**
 * LogoIcon — PH monogram SVG
 *
 * Two visual variants:
 *  • "theme"  — adapts to the active color theme via CSS variables
 *  • "brand"  — fixed brand colors (#2D5432 / #6B9870), for light backgrounds
 *               like OG images or e-mails
 *
 * Usage:
 *   <LogoIcon size={32} />                   // theme variant (default)
 *   <LogoIcon size={32} variant="brand" />   // brand variant
 */

interface LogoIconProps {
  size?: number
  variant?: 'theme' | 'brand'
  className?: string
}

export function LogoIcon({ size = 32, variant = 'theme', className }: LogoIconProps) {
  const pColor = variant === 'brand' ? '#2D5432' : 'var(--green-primary)'
  const hColor = variant === 'brand' ? '#6B9870' : 'var(--green-primary)'
  const hOpacity = variant === 'brand' ? 1 : 0.62

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* ── H (rendered first, behind P) ── */}
      <g fill={hColor} opacity={hOpacity}>
        {/* Left leg */}
        <rect x="12" y="20" width="13" height="44" rx="4" />
        {/* Right leg */}
        <rect x="42" y="20" width="14" height="44" rx="4" />
        {/* Crossbar */}
        <rect x="12" y="36" width="44" height="12" />
      </g>

      {/* ── P (rendered on top) ── */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={pColor}
        d="M 0 5 Q 0 0 5 0 H 33 Q 50 0 50 17 Q 50 34 33 34 H 18 V 59 Q 18 64 13 64 H 5 Q 0 64 0 59 Z
           M 18 11 H 30 Q 40 11 40 17 Q 40 23 30 23 H 18 Z"
      />
    </svg>
  )
}
