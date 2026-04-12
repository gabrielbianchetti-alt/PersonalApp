import { redirect } from 'next/navigation'

export default function CobrancaPage() {
  redirect('/dashboard/financeiro?tab=cobranca')
}
