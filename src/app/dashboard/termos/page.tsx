import { redirect } from 'next/navigation'

export default function TermosPage() {
  redirect('/dashboard/alunos?tab=termos')
}
