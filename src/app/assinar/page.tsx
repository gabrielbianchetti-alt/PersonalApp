import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssinarClient } from './AssinarClient'

export default async function AssinarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Count alunos and aulas
  const [{ count: alunosCount }, { count: aulasCount }] = await Promise.all([
    admin.from('alunos').select('id', { count: 'exact', head: true }).eq('professor_id', user.id),
    admin.from('eventos_agenda').select('id', { count: 'exact', head: true }).eq('professor_id', user.id),
  ])

  return (
    <AssinarClient
      alunosCount={alunosCount ?? 0}
      aulasCount={aulasCount ?? 0}
    />
  )
}
