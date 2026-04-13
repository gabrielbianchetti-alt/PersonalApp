import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from './LandingPage'

export const metadata: Metadata = {
  title: 'PersonalHub — Gestão para Personal Trainers',
  description:
    'O app completo para personal trainers: gerencie alunos, agenda, cobranças e financeiro em um só lugar. Comece grátis por 7 dias.',
  openGraph: {
    title: 'PersonalHub — Gestão para Personal Trainers',
    description: 'Chega de planilha. Gerencie seus alunos como profissional.',
    type: 'website',
  },
}

export default async function HomePage() {
  // Redirect authenticated users straight to their dashboard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return <LandingPage />
}
