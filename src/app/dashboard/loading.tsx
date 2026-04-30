import { Skeleton } from '@/components/dashboard/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex flex-col gap-2">
        <Skeleton width={220} height={28} />
        <Skeleton width={320} height={14} />
      </div>

      {/* Métricas em grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="p-4 rounded-2xl flex flex-col gap-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <Skeleton height={12} width="60%" />
            <Skeleton height={26} width="80%" />
            <Skeleton height={11} width="40%" />
          </div>
        ))}
      </div>

      {/* Bloco timeline */}
      <div
        className="p-5 rounded-2xl flex flex-col gap-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <Skeleton height={18} width={180} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton width={40} height={40} rounded="full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton height={12} width="40%" />
              <Skeleton height={10} width="65%" />
            </div>
            <Skeleton height={28} width={70} />
          </div>
        ))}
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1].map(i => (
          <div
            key={i}
            className="p-4 rounded-2xl flex flex-col gap-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <Skeleton height={14} width="70%" />
            <Skeleton height={10} width="90%" />
          </div>
        ))}
      </div>
    </div>
  )
}
