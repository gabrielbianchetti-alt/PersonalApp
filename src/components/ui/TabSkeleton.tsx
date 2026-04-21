/** Skeleton leve exibido enquanto o chunk da aba é baixado. */
export function TabSkeleton() {
  return (
    <div className="p-4 md:p-6 flex flex-col gap-3" style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <div className="h-8 rounded-xl" style={{ background: 'var(--bg-card)', opacity: 0.6 }} />
      <div className="h-24 rounded-xl" style={{ background: 'var(--bg-card)', opacity: 0.6 }} />
      <div className="h-16 rounded-xl" style={{ background: 'var(--bg-card)', opacity: 0.5 }} />
      <div className="h-16 rounded-xl" style={{ background: 'var(--bg-card)', opacity: 0.4 }} />
      <div className="h-16 rounded-xl" style={{ background: 'var(--bg-card)', opacity: 0.3 }} />
    </div>
  )
}
