import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getOrCreatePerfilAction } from './actions'
import { getOrCreateAssinaturaAction } from './assinatura-actions'
import { Configuracoes } from './Configuracoes'

export const metadata: Metadata = { title: 'Configurações — PersonalHub' }

export default async function ConfiguracoesPage() {
  const [perfilResult, assinaturaResult] = await Promise.all([
    getOrCreatePerfilAction(),
    getOrCreateAssinaturaAction(),
  ])

  if (perfilResult.error || !perfilResult.data) redirect('/login')

  return (
    <Configuracoes
      perfil={perfilResult.data}
      email={perfilResult.email ?? ''}
      assinatura={assinaturaResult.data}
    />
  )
}
