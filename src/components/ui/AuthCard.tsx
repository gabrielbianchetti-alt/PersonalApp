interface AuthCardProps {
  children: React.ReactNode
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div
      className="w-full rounded-2xl p-8"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </div>
  )
}
