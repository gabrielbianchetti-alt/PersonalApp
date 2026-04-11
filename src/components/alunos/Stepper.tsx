interface StepperProps {
  steps: string[]
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                style={
                  done
                    ? { background: 'var(--green-primary)', color: '#000' }
                    : active
                    ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '2px solid var(--green-primary)' }
                    : { background: 'var(--bg-input)', color: 'var(--text-muted)', border: '2px solid var(--border-subtle)' }
                }
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap hidden sm:block"
                style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-2 mb-5 transition-all duration-200"
                style={{ background: done ? 'var(--green-primary)' : 'var(--border-subtle)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
