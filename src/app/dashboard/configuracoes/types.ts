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
  { label: 'Laranja', value: '#FC6E20' },  // padrão
  { label: 'Verde',   value: '#00E676' },
  { label: 'Azul',    value: '#2196F3' },
  { label: 'Roxo',    value: '#9C27B0' },
  { label: 'Rosa',    value: '#E91E63' },
  { label: 'Vermelho',value: '#F44336' },
  { label: 'Ciano',   value: '#00BCD4' },
  { label: 'Amarelo', value: '#FFEB3B' },
]
