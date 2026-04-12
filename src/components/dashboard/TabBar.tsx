'use client'

export interface TabItem {
  key: string
  label: string
}

interface Props {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
}

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div
      className="shrink-0"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className="whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
            style={
              active === t.key
                ? {
                    color: 'var(--green-primary)',
                    borderBottom: '2px solid var(--green-primary)',
                    marginBottom: '-1px',
                  }
                : {
                    color: 'var(--text-muted)',
                    borderBottom: '2px solid transparent',
                    marginBottom: '-1px',
                  }
            }
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
