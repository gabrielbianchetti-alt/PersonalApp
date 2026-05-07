'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { dismissNudgeAction } from '@/app/dashboard/nudges-actions'

interface Props {
  /** Stable identifier persisted in nudges_dismissed.nudge_key. */
  nudgeKey: string
  title: string
  description?: string
  /** Primary CTA — link to where the user should act. Optional. */
  cta?: { label: string; href: string }
  /** "Dismiss" label override; defaults to "Mais tarde". */
  dismissLabel?: string
}

/**
 * Subtle banner-style nudge. Dispensable, never blocking. Once dismissed it
 * stays dismissed forever (until the user resets in Configurações).
 *
 * Visibility decision is the *parent's* job — the parent reads
 * `userState.dismissedNudges` server-side and only renders this when the
 * nudge should show. This component handles the dismiss action and the
 * micro-animation when the user clicks X / "Mais tarde".
 */
export function Nudge({ nudgeKey, title, description, cta, dismissLabel = 'Mais tarde' }: Props) {
  const [hidden, setHidden] = useState(false)
  const [, startTransition] = useTransition()

  function dismiss() {
    setHidden(true)
    startTransition(async () => {
      await dismissNudgeAction(nudgeKey)
    })
  }

  if (hidden) return null

  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-start gap-3"
      style={{
        background: 'var(--green-muted)',
        border: '1px solid var(--green-border)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {cta && (
            <Link
              href={cta.href}
              className="text-xs font-bold"
              style={{ color: 'var(--green-primary)' }}
            >
              {cta.label} →
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', padding: 0 }}
          >
            {dismissLabel}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar dica"
        className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer shrink-0"
        style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
