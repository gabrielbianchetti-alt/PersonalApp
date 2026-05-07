import type { ReactNode } from 'react'
import Link from 'next/link'

interface CTA {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

interface Props {
  /** Big heading. Keep it short — one short sentence. */
  title: string
  /** Optional supporting copy under the title. */
  description?: string
  /** Icon rendered in the rounded badge above the title. */
  icon?: ReactNode
  /** Up to two CTAs. The first defaults to primary styling. */
  ctas?: CTA[]
  /** Optional emphasis style — adds a green dashed border + glow. */
  highlight?: boolean
  /** Override the inner container's max width. */
  maxWidth?: number | string
  className?: string
}

/**
 * Educational empty state, used everywhere Progressive Disclosure replaces
 * a section that has no data with a friendly call-to-action instead of an
 * empty list. Server component (no client interactivity needed for CTAs —
 * they are just Links).
 */
export function EmptyState({
  title,
  description,
  icon,
  ctas = [],
  highlight = false,
  maxWidth = 480,
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl px-6 py-10 ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: highlight
          ? '1px dashed var(--green-border)'
          : '1px dashed var(--border-subtle)',
        boxShadow: highlight ? '0 0 0 4px rgba(16,185,129,0.06)' : 'none',
        maxWidth,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: highlight ? 'var(--green-muted)' : 'var(--bg-input)',
            color: highlight ? 'var(--green-primary)' : 'var(--text-muted)',
          }}
        >
          {icon}
        </div>
      )}
      <p className="text-base font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      {description && (
        <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {ctas.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {ctas.map((cta, i) => {
            const variant = cta.variant ?? (i === 0 ? 'primary' : 'secondary')
            return (
              <Link
                key={cta.href + cta.label}
                href={cta.href}
                className="h-10 px-5 rounded-xl text-sm font-semibold inline-flex items-center"
                style={
                  variant === 'primary'
                    ? { background: 'var(--green-primary)', color: '#000' }
                    : {
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }
                }
              >
                {cta.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
