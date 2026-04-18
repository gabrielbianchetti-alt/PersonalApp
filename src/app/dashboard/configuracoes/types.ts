export type ModoTema = 'escuro' | 'claro' | 'auto'

export interface ProfessorPerfil {
  id: string
  professor_id: string
  nome: string
  foto_url: string | null
  cor_tema: string
  modo_tema: ModoTema
  codigo_indicacao: string
  created_at: string
  updated_at: string
}

export const COR_PRESETS = [
  { label: 'Esmeralda', value: '#10B981' },  // padrão
  { label: 'Azul',      value: '#3B82F6' },
  { label: 'Roxo',      value: '#8B5CF6' },
  { label: 'Rosa',      value: '#E91E63' },
  { label: 'Vermelho',  value: '#EF4444' },
  { label: 'Ciano',     value: '#38BDF8' },
  { label: 'Âmbar',     value: '#F59E0B' },
]
