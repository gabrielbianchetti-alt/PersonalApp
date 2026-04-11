'use client'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  loading?: boolean
  children: React.ReactNode
}

export function Button({ variant = 'primary', loading, children, disabled, className, ...props }: ButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      disabled={disabled || loading}
      className={`
        w-full h-12 rounded-xl font-semibold text-sm
        flex items-center justify-center gap-2
        transition-all duration-150 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className ?? ''}
      `}
      style={
        isPrimary
          ? {
              background: loading || disabled ? 'var(--green-hover)' : 'var(--green-primary)',
              color: '#000',
            }
          : {
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }
      }
      onMouseEnter={(e) => {
        if (disabled || loading) return
        const el = e.currentTarget
        if (isPrimary) el.style.background = 'var(--green-hover)'
        else { el.style.borderColor = 'var(--text-muted)'; el.style.color = 'var(--text-primary)' }
      }}
      onMouseLeave={(e) => {
        if (disabled || loading) return
        const el = e.currentTarget
        if (isPrimary) el.style.background = 'var(--green-primary)'
        else { el.style.borderColor = 'var(--border-subtle)'; el.style.color = 'var(--text-secondary)' }
      }}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin"
            width="16" height="16"
            viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Aguarde...
        </>
      ) : children}
    </button>
  )
}
