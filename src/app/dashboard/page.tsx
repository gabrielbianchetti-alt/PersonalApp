export default function DashboardPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
          style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}
        >
          Em construção
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          O painel de controle será construído em breve.
        </p>
      </div>
    </div>
  )
}
