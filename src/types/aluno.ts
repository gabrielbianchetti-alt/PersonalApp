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

export type ModeloCobranca = 'por_aula' | 'mensalidade' | 'pacote'
export type TipoPacote     = 'fixo' | 'alternado'

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
  modelo_cobranca: ModeloCobranca
  valor: string
  dia_cobranca: string   // 1-28, dia do mês para cobrar (mensalidade/por_aula)

  // Etapa 2 — pacote-only fields
  pacote_tipo:          TipoPacote  // 'fixo' (com horários) | 'alternado' (sob demanda)
  pacote_quantidade:    string      // ex "10"
  pacote_validade_dias: string      // ex "30"
  pacote_data_inicio:   string      // YYYY-MM-DD
  pacote_data_cobranca: string      // YYYY-MM-DD

  // Etapa 3
  objetivos: string[]
  restricoes: string
  observacoes: string
}

export function initialFormData(): AlunoFormData {
  const hoje = new Date().toISOString().split('T')[0]
  return {
    nome: '',
    whatsapp: '',
    data_nascimento: '',
    data_inicio: hoje,
    emergencia_nome: '',
    emergencia_telefone: '',
    emergencia_parentesco: '',
    horarios: [],
    duracao: '60',
    local: '',
    endereco: '',
    modelo_cobranca: 'por_aula',
    valor: '',
    dia_cobranca: '1',
    pacote_tipo: 'alternado',
    pacote_quantidade: '10',
    pacote_validade_dias: '30',
    pacote_data_inicio: hoje,
    pacote_data_cobranca: hoje,
    objetivos: [],
    restricoes: '',
    observacoes: '',
  }
}

/** Soma N dias a uma data ISO (YYYY-MM-DD) e devolve ISO */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
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
  if (formData.modelo_cobranca === 'pacote') {
    const qtd = parseInt(formData.pacote_quantidade) || 0
    const dias = parseInt(formData.pacote_validade_dias) || 1
    if (qtd === 0 || valor === 0) return 0
    // Normaliza para mês (30 dias)
    return Math.round((valor * 30 / dias) * 100) / 100
  }
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
