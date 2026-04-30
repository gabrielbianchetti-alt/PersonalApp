import { Skeleton } from '@/components/dashboard/Skeleton'

export default function FinanceiroLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Section header (parecido com FinanceiroHub) */}
      <div className="px-4 md:px-6 pt-5 flex flex-col gap-4">
        <Skeleton width={140} height={26} />
        <div className="flex gap-2">
          {[80, 90, 100, 70].map((w, i) => (
            <Skeleton key={i} width={w} height={32} rounded="lg" />
          ))}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto w-full flex flex-col gap-5">
        {/* Linha 1: Faturamento + Custos */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[0, 1].map(i => (
            <div
              key={i}
              className="p-3 sm:p-4 rounded-2xl flex flex-col gap-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <Skeleton height={11} width="55%" />
              <Skeleton height={22} width="75%" />
              <Skeleton height={10} width="40%" />
            </div>
          ))}
        </div>

        {/* Linha 2: Card largo Lucros Líquidos */}
        <div
          className="rounded-2xl p-4 sm:p-5 md:p-6"
          style={{ background: '#111827', border: '1px solid #374151' }}
        >
          <Skeleton height={14} width={140} />
          <div className="flex flex-row items-stretch mt-4">
            <div className="flex-1 pr-3 sm:pr-6 flex flex-col gap-2">
              <Skeleton height={10} width="40%" />
              <Skeleton height={28} width="80%" />
              <Skeleton height={10} width="55%" />
            </div>
            <div className="w-px self-stretch" style={{ background: '#374151' }} />
            <div className="flex-1 pl-3 sm:pl-6 flex flex-col gap-2">
              <Skeleton height={10} width="40%" />
              <Skeleton height={28} width="80%" />
              <Skeleton height={10} width="55%" />
            </div>
          </div>
        </div>

        {/* Margem */}
        <div
          className="p-4 rounded-2xl flex flex-col gap-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex justify-between items-center">
            <Skeleton height={11} width={120} />
            <Skeleton height={14} width={50} />
          </div>
          <Skeleton height={8} width="100%" rounded="full" />
        </div>

        {/* Gráfico histórico */}
        <div
          className="p-4 rounded-2xl flex flex-col gap-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <Skeleton height={14} width={180} />
          <Skeleton height={180} width="100%" rounded="lg" />
        </div>
      </div>
    </div>
  )
}
