import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CalculoMensal } from './CalculoMensal'

export const metadata: Metadata = {
  title: 'Cálculo Mensal — PersonalHub',
}

export default async function CalculoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, nome, dias_semana, modelo_cobranca, valor')
    .eq('professor_id', user?.id ?? '')
    .eq('status', 'ativo')
    .order('nome', { ascending: true })

  return <CalculoMensal alunos={alunos ?? []} />
}
