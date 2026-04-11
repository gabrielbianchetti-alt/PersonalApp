import { DashboardCards } from '@/components/dashboard/DashboardCards'

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Bem-vindo ao PersonalHub
        </p>
      </div>
      <DashboardCards />
    </div>
  )
}
