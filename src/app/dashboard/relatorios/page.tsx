import type { Metadata } from 'next'
import { RelatoriosHub } from './RelatoriosHub'

export const metadata: Metadata = { title: 'Relatórios — PersonalHub' }

export default function RelatoriosPage() {
  const now     = new Date()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return <RelatoriosHub mesAtual={mesAtual} />
}
