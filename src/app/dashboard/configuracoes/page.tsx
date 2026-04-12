import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getOrCreatePerfilAction } from './actions'
import { Configuracoes } from './Configuracoes'

export const metadata: Metadata = { title: 'Configurações — PersonalHub' }

export default async function ConfiguracoesPage() {
  const { data: perfil, email, error } = await getOrCreatePerfilAction()

  if (error || !perfil) redirect('/login')

  return <Configuracoes perfil={perfil} email={email ?? ''} />
}
