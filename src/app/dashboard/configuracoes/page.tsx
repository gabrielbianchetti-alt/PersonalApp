import type { Metadata } from 'next'
import { getOrCreatePerfilAction } from './actions'
import { getOrCreateAssinaturaAction } from './assinatura-actions'
import { Configuracoes } from './Configuracoes'

export const metadata: Metadata = { title: 'Configurações — PersonalHub' }

export default async function ConfiguracoesPage() {
  const [perfilResult, assinaturaResult] = await Promise.all([
    getOrCreatePerfilAction(),
    getOrCreateAssinaturaAction(),
  ])

  if (perfilResult.error || !perfilResult.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 p-8 text-center gap-3">
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro ao carregar perfil</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {perfilResult.error ?? 'Tente recarregar a página.'}
        </p>
        <a href="/dashboard/configuracoes"
          className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--green-primary)', color: '#000' }}>
          Recarregar
        </a>
      </div>
    )
  }

  return (
    <Configuracoes
      perfil={perfilResult.data}
      email={perfilResult.email ?? ''}
      assinatura={assinaturaResult.data}
    />
  )
}
