import { redirect } from 'next/navigation'

export default function CalculoPage() {
  redirect('/dashboard/financeiro?tab=calculo')
}
