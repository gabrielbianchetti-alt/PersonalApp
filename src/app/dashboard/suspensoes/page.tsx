import { redirect } from 'next/navigation'

export default function SuspensoesPage() {
  redirect('/dashboard/alunos?tab=suspensos')
}
