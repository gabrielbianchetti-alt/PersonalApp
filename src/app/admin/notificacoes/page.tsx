import type { Metadata } from 'next'
import { AdminNotificacoesHub } from './AdminNotificacoesHub'

export const metadata: Metadata = { title: 'Notificações Admin — PersonalHub' }

export default function AdminNotificacoesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Notificações
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Envie notificações para todos os professores ou grupos específicos.
        </p>
      </div>
      <AdminNotificacoesHub />
    </div>
  )
}
