import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Assinar — PersonalHub',
}

export default function AssinarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-page, #0f172a)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Minimal top bar */}
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ color: '#e0b066', fontWeight: 800, fontSize: 11 }}>PH</span>
        </div>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>PersonalHub</span>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
