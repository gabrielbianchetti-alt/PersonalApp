import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CobrancaMensal } from './CobrancaMensal'

export const metadata: Metadata = { title: 'Cobrança — PersonalHub' }

export default async function CobrancaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date()
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [{ data: alunos }, { data: cobrancasIniciais }, { data: prefs }] =
    await Promise.all([
      supabase
        .from('alunos')
        .select('id, nome, whatsapp, dias_semana, modelo_cobranca, valor, forma_pagamento')
        .eq('professor_id', user?.id ?? '')
        .eq('status', 'ativo')
        .order('nome'),
      supabase
        .from('cobrancas')
        .select('*')
        .eq('professor_id', user?.id ?? '')
        .eq('mes_referencia', mesAtual),
      supabase
        .from('preferencias_cobranca')
        .select('*')
        .eq('professor_id', user?.id ?? '')
        .maybeSingle(),
    ])

  return (
    <CobrancaMensal
      alunos={alunos ?? []}
      cobrancasIniciais={cobrancasIniciais ?? []}
      preferencias={prefs}
      mesInicial={mesAtual}
    />
  )
}
