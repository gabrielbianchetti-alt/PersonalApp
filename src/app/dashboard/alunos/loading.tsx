import { Skeleton } from '@/components/dashboard/Skeleton'

export default function AlunosLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton width={120} height={26} />
          <Skeleton width={220} height={12} />
        </div>
        <Skeleton width={120} height={36} rounded="xl" />
      </div>

      {/* Filter row */}
      <div className="flex gap-2">
        {[60, 80, 100, 70].map((w, i) => (
          <Skeleton key={i} width={w} height={32} rounded="lg" />
        ))}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <Skeleton width={48} height={48} rounded="full" />
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <Skeleton height={14} width="60%" />
              <Skeleton height={10} width="80%" />
              <Skeleton height={10} width="50%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
