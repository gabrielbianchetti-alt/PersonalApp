export type NotificacaoTipo = 'sistema' | 'admin'

export type NotificacaoCategoria =
  | 'info'
  | 'importante'
  | 'urgente'
  | 'aula'
  | 'cobranca'
  | 'reposicao'
  | 'aniversario'
  | 'churn'
  | 'custo'

export interface Notificacao {
  id: string
  tipo: NotificacaoTipo
  categoria: NotificacaoCategoria
  titulo: string
  mensagem: string
  link: string | null
  remetente_id: string | null
  created_at: string
}

export interface NotificacaoComLeitura {
  id: string              // notificacoes_usuario.id
  notificacao_id: string
  usuario_id: string
  lida: boolean
  lida_em: string | null
  created_at: string      // notificacoes_usuario.created_at
  notificacao: Notificacao
}
