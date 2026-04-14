/**
 * Supabase admin helpers for test data setup/teardown.
 * Uses the service-role key so it bypasses RLS.
 */
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Return the test user's UUID */
export async function getTestUserId(): Promise<string | null> {
  const sb = adminClient()
  const { data } = await sb.auth.admin.listUsers()
  const user = data?.users?.find(u => u.email === 'teste@personalhub.com')
  return user?.id ?? null
}

/** Delete all alunos created by the test user (for cleanup) */
export async function cleanTestAlunos(professorId: string) {
  const sb = adminClient()
  await sb.from('alunos').delete().eq('professor_id', professorId).like('nome', '%[TESTE]%')
}

/** Delete all custos created by the test user for cleanup */
export async function cleanTestCustos(professorId: string) {
  const sb = adminClient()
  await sb.from('custos').delete().eq('professor_id', professorId).like('nome', '%[TESTE]%')
}

/** Create a test aluno directly via DB (bypasses UI, for calc tests) */
export async function createTestAluno(professorId: string, overrides: Record<string, unknown> = {}) {
  const sb = adminClient()
  const payload = {
    professor_id:     professorId,
    nome:             '[TESTE] Aluno Automático',
    whatsapp:         '11999990000',
    horarios:         [{ dia: 'seg', horario: '08:00' }, { dia: 'qua', horario: '08:00' }, { dia: 'sex', horario: '08:00' }],
    modelo_cobranca:  'por_aula',
    valor:            150,
    forma_pagamento:  'pix',
    duracao:          60,
    status:           'ativo',
    dia_cobranca:     1,
    ...overrides,
  }
  const { data, error } = await sb.from('alunos').insert(payload).select().single()
  if (error) throw new Error('Failed to create test aluno: ' + error.message)
  return data
}
