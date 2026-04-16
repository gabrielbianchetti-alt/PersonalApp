interface AlertProps {
  type: 'error' | 'success'
  message: string
}

export function Alert({ type, message }: AlertProps) {
  const isError = type === 'error'
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl text-sm"
      style={{
        background: isError ? 'rgba(255,82,82,0.08)' : 'rgba(252,110,32,0.08)',
        border: `1px solid ${isError ? 'rgba(255,82,82,0.2)' : 'rgba(252,110,32,0.2)'}`,
        color: isError ? '#FF8A80' : '#69F0AE',
      }}
    >
      <span className="mt-px shrink-0">
        {isError ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        )}
      </span>
      {message}
    </div>
  )
}
