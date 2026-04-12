export interface HorarioDia {
  dia: string   // 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
  horario: string  // 'HH:MM'
}

/** Extract just the day keys from horarios */
export function getDias(horarios: HorarioDia[]): string[] {
  return horarios.map(h => h.dia)
}
/** Get the horario for a specific day key (returns '' if not found) */
export function getHorarioDia(horarios: HorarioDia[], dia: string): string {
  return horarios.find(h => h.dia === dia)?.horario ?? ''
}
/** Get first horario (for backward compat display) */
export function getPrimeiroHorario(horarios: HorarioDia[]): string {
  return horarios[0]?.horario ?? ''
}

export interface AlunoFormData {
  // Etapa 1
  nome: string
  whatsapp: string
  data_nascimento: string
  data_inicio: string
  emergencia_nome: string
  emergencia_telefone: string
  emergencia_parentesco: string

  // Etapa 2
  horarios: HorarioDia[]
  duracao: string
  local: string
  endereco: string
  modelo_cobranca: 'por_aula' | 'mensalidade'
  valor: string
  forma_pagamento: 'pix' | 'cartao'

  // Etapa 3
  objetivos: string[]
  restricoes: string
  observacoes: string
}

export function initialFormData(): AlunoFormData {
  return {
    nome: '',
    whatsapp: '',
    data_nascimento: '',
    data_inicio: new Date().toISOString().split('T')[0],
    emergencia_nome: '',
    emergencia_telefone: '',
    emergencia_parentesco: '',
    horarios: [],
    duracao: '60',
    local: '',
    endereco: '',
    modelo_cobranca: 'por_aula',
    valor: '',
    forma_pagamento: 'pix',
    objetivos: [],
    restricoes: '',
    observacoes: '',
  }
}

export const DIAS_SEMANA = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
]

export const DIAS_LABEL: Record<string, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
}

export const DURACAO_OPCOES = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h 30min' },
]

export const LOCAL_OPCOES = ['Academia', 'Domicílio', 'Parque', 'Online', 'Outro']

export const OBJETIVOS_OPCOES = [
  'Emagrecimento',
  'Hipertrofia',
  'Condicionamento',
  'Saúde',
  'Reabilitação',
  'Flexibilidade',
  'Outro',
]

export function calcularPrevisaoMensal(formData: AlunoFormData): number {
  const valor = parseFloat(formData.valor) || 0
  if (formData.modelo_cobranca === 'mensalidade') return valor
  return Math.round(formData.horarios.length * 4.3 * valor * 100) / 100
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
