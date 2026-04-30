import { Skeleton } from '@/components/dashboard/Skeleton'

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function AgendaLoading() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width={140} height={26} />
        <div className="flex gap-2">
          <Skeleton width={36} height={36} rounded="lg" />
          <Skeleton width={36} height={36} rounded="lg" />
        </div>
      </div>

      {/* Day headers (visíveis sem skeleton para reduzir CLS) */}
      <div className="grid grid-cols-7 gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {DIAS.map(d => (
          <div key={d} className="text-center py-1.5">{d}</div>
        ))}
      </div>

      {/* Grade da semana */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 * 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg p-2 flex flex-col gap-1.5 min-h-[64px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            {i % 3 === 0 && <Skeleton height={20} width="90%" rounded="md" />}
            {i % 4 === 1 && <Skeleton height={20} width="70%" rounded="md" />}
          </div>
        ))}
      </div>
    </div>
  )
}
