export type SuspensaoTipo    = 'suspensao' | 'atestado'
export type SuspensaoStatus  = 'ativa' | 'encerrada'
export type AcaoHorario      = 'disponivel' | 'bloqueado' | 'reposicoes'

export interface SuspensaoRow {
  id: string
  professor_id: string
  aluno_id: string
  tipo: SuspensaoTipo
  data_inicio: string        // "YYYY-MM-DD"
  data_retorno: string | null
  motivo: string | null
  acao_horario: AcaoHorario
  status: SuspensaoStatus
  created_at: string
  updated_at: string
  // joined
  aluno_nome?: string
  aluno_horario?: string
  aluno_dias?: string[]
}

export interface AlunoSuspenso {
  id: string
  nome: string
  horario_inicio: string
  dias_semana: string[]
  suspensao: SuspensaoRow
}

export interface Conflitante {
  id: string
  nome: string
  horario_inicio: string
  dias_semana: string[]
}
