import { redirect } from 'next/navigation'

export default function FaltasPage() {
  redirect('/dashboard/agenda?tab=faltas')
}
