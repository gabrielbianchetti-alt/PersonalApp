/**
 * Modo Demonstração — dados fictícios consistentes usados em toda a app
 * quando o cookie `ph-demo-mode=1` está ativo.
 *
 * NUNCA toca no banco. Os IDs são estáveis (fixos por "slot") para que os
 * links internos entre telas funcionem (ex: agenda → detalhes do aluno).
 *
 * Professor: Carlos Mendes
 */

// ─── tipos leves (matches shape das queries reais) ────────────────────────────

export interface DemoAluno {
  id: string
  professor_id: string
  nome: string
  whatsapp: string | null
  data_nascimento: string | null
  data_inicio: string | null
  emergencia_nome: string | null
  emergencia_telefone: string | null
  emergencia_parentesco: string | null
  horarios: { dia: string; horario: string }[]
  duracao: number
  local: string
  endereco: string | null
  modelo_cobranca: 'por_aula' | 'mensalidade' | 'pacote'
  valor: number
  forma_pagamento: 'pix' | 'cartao'
  dia_cobranca: number
  objetivos: string[]
  restricoes: string | null
  observacoes: string | null
  status: 'ativo' | 'suspenso' | 'inativo'
  created_at: string
}

export interface DemoEvento {
  id: string
  professor_id: string
  tipo: 'aula' | 'reposicao' | 'reuniao' | 'bloqueado' | 'refeicao' | 'outro' | 'aula_extra'
  titulo: string
  aluno_id: string | null
  dia_semana: string | null
  data_especifica: string | null
  horario_inicio: string
  duracao: number
  cor: string | null
  observacao: string | null
  valor: number | null
  serie_id: string | null
  pacote_id: string | null
  created_at: string
  updated_at: string
}

export interface DemoFalta {
  id: string
  professor_id: string
  aluno_id: string
  data_falta: string
  culpa: 'aluno' | 'professor'
  tipo: 'falta' | 'cancelamento'
  horario_falta: string | null
  status: 'pendente' | 'reposta' | 'credito' | 'cobranca' | 'expirada'
  credito_valor: number | null
  mes_validade: string | null
  prazo_vencimento: string | null
  created_at: string
}

export interface DemoCobranca {
  id: string
  professor_id: string
  aluno_id: string
  mes_referencia: string
  valor: number
  status: 'pendente' | 'enviado' | 'pago'
  mensagem: string | null
  created_at: string
}

export interface DemoPacote {
  id: string
  professor_id: string
  aluno_id: string
  quantidade_total: number
  quantidade_usada: number
  valor: number
  validade_dias: number
  data_inicio: string
  data_vencimento: string
  data_cobranca: string
  status: 'ativo' | 'vencido' | 'finalizado'
  renovacao_de: string | null
  created_at: string
  updated_at: string
}

export interface DemoCusto {
  id: string
  professor_id: string
  nome: string
  valor: number
  tipo: 'fixo' | 'variavel'
  categoria: string
  data: string | null
  mes_referencia: string
  ativo: boolean | null
  created_at: string
}

export interface DemoReceitaExtra {
  id: string
  professor_id: string
  descricao: string
  valor: number
  data: string
  mes_referencia: string
  created_at: string
}

export interface DemoHistoricoMes {
  mes: string
  receitas_extras: number
  custos: number
}

export interface DemoNotificacao {
  id: string
  professor_id: string
  tipo: string
  titulo: string
  corpo: string | null
  link: string | null
  lida: boolean
  created_at: string
}

export interface DemoSuspensao {
  id: string
  professor_id: string
  aluno_id: string
  aluno_nome: string
  aluno_horarios: { dia: string; horario: string }[]
  tipo: 'pausa_temporaria' | 'afastamento' | 'ferias'
  status: 'ativa' | 'encerrada'
  data_inicio: string
  data_retorno: string | null
  motivo: string | null
  acao_horario: 'manter' | 'liberar'
  created_at: string
  updated_at: string
}

export interface DemoModeloTermo {
  id: string
  professor_id: string
  nome: string
  conteudo: string
  tipo: 'padrao' | 'custom'
  created_at: string
  updated_at: string
}

export interface DemoTermoEnviado {
  id: string
  professor_id: string
  aluno_id: string
  aluno_nome: string
  conteudo: string
  modelo_usado: string
  enviado_em: string
  created_at: string
}

// ─── constantes ───────────────────────────────────────────────────────────────

export const DEMO_PROFESSOR_ID   = 'demo-prof-00000000'
export const DEMO_PROFESSOR_NOME = 'Carlos Mendes'

// Helpers para datas
function today(): Date { return new Date() }
function isoDate(d: Date): string { return d.toISOString().split('T')[0] }
function mesRef(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function daysAgo(n: number): string { return isoDate(addDays(today(), -n)) }
function daysAhead(n: number): string { return isoDate(addDays(today(), n)) }

// DOW 0=dom..6=sab → chave semana
const DOW_TO_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
function keyForDate(d: Date): string { return DOW_TO_KEY[d.getDay()] }

/** Data da ocorrência mais próxima (hoje ou futura) da chave de semana */
function nextDateForDayKey(dayKey: string, ref: Date = today()): Date {
  const idx = DOW_TO_KEY.indexOf(dayKey)
  if (idx < 0) return ref
  const refDay = ref.getDay()
  const diff = (idx - refDay + 7) % 7
  return addDays(ref, diff)
}

/** Data mais próxima (passada ou hoje) para uma chave de semana */
function lastDateForDayKey(dayKey: string, ref: Date = today()): Date {
  const idx = DOW_TO_KEY.indexOf(dayKey)
  if (idx < 0) return ref
  const refDay = ref.getDay()
  const diff = (refDay - idx + 7) % 7
  return addDays(ref, -diff)
}

// ─── ALUNOS ───────────────────────────────────────────────────────────────────

export function getDemoAlunos(): DemoAluno[] {
  const hoje = isoDate(today())
  const baseMeses = (n: number) => isoDate(addDays(today(), -30 * n))

  return [
    {
      id: 'demo-aluno-01', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Ana Silva',
      whatsapp: '11987654321', data_nascimento: '1992-05-14', data_inicio: baseMeses(8),
      emergencia_nome: 'Paulo Silva', emergencia_telefone: '11987000000', emergencia_parentesco: 'Pai',
      horarios: [{ dia: 'seg', horario: '06:00' }, { dia: 'qua', horario: '06:00' }, { dia: 'sex', horario: '06:00' }],
      duracao: 60, local: 'Academia', endereco: null,
      modelo_cobranca: 'por_aula', valor: 150, forma_pagamento: 'pix', dia_cobranca: 5,
      objetivos: ['Emagrecimento', 'Condicionamento'], restricoes: null, observacoes: null,
      status: 'ativo', created_at: baseMeses(8),
    },
    {
      id: 'demo-aluno-02', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Pedro Costa',
      whatsapp: '11987654322', data_nascimento: '1988-11-03', data_inicio: baseMeses(6),
      emergencia_nome: null, emergencia_telefone: null, emergencia_parentesco: null,
      horarios: [{ dia: 'ter', horario: '07:00' }, { dia: 'qui', horario: '07:00' }],
      duracao: 60, local: 'Domicílio', endereco: 'Rua das Acácias, 120',
      modelo_cobranca: 'mensalidade', valor: 1040, forma_pagamento: 'pix', dia_cobranca: 10,
      objetivos: ['Hipertrofia'], restricoes: 'Lesão antiga no joelho direito', observacoes: null,
      status: 'ativo', created_at: baseMeses(6),
    },
    {
      id: 'demo-aluno-03', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Lucas Mendes',
      whatsapp: '11987654323', data_nascimento: '1995-02-20', data_inicio: baseMeses(4),
      emergencia_nome: null, emergencia_telefone: null, emergencia_parentesco: null,
      horarios: [{ dia: 'seg', horario: '08:00' }, { dia: 'qua', horario: '08:00' }, { dia: 'sex', horario: '08:00' }],
      duracao: 60, local: 'Academia', endereco: null,
      modelo_cobranca: 'por_aula', valor: 140, forma_pagamento: 'pix', dia_cobranca: 8,
      objetivos: ['Hipertrofia', 'Saúde'], restricoes: null, observacoes: null,
      status: 'ativo', created_at: baseMeses(4),
    },
    {
      id: 'demo-aluno-04', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Marina Santos',
      whatsapp: '11987654324', data_nascimento: '1990-07-28', data_inicio: baseMeses(10),
      emergencia_nome: null, emergencia_telefone: null, emergencia_parentesco: null,
      horarios: [{ dia: 'ter', horario: '09:00' }, { dia: 'qui', horario: '09:00' }, { dia: 'sab', horario: '09:00' }],
      duracao: 60, local: 'Academia', endereco: null,
      modelo_cobranca: 'mensalidade', valor: 1560, forma_pagamento: 'cartao', dia_cobranca: 15,
      objetivos: ['Condicionamento', 'Saúde'], restricoes: null, observacoes: 'Prefere treinos matinais',
      status: 'ativo', created_at: baseMeses(10),
    },
    {
      id: 'demo-aluno-05', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Rafael Lima',
      whatsapp: '11987654325', data_nascimento: '1987-09-12', data_inicio: baseMeses(3),
      emergencia_nome: null, emergencia_telefone: null, emergencia_parentesco: null,
      horarios: [{ dia: 'seg', horario: '10:00' }, { dia: 'qua', horario: '10:00' }],
      duracao: 60, local: 'Parque', endereco: 'Parque Ibirapuera, portão 3',
      modelo_cobranca: 'por_aula', valor: 160, forma_pagamento: 'pix', dia_cobranca: 1,
      objetivos: ['Emagrecimento'], restricoes: null, observacoes: null,
      status: 'ativo', created_at: baseMeses(3),
    },
    {
      id: 'demo-aluno-06', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Carla Oliveira',
      whatsapp: '11987654326', data_nascimento: '1993-03-08', data_inicio: baseMeses(2),
      emergencia_nome: null, emergencia_telefone: null, emergencia_parentesco: null,
      horarios: [], // pacote não tem horários fixos
      duracao: 60, local: 'Academia', endereco: null,
      modelo_cobranca: 'pacote', valor: 1500, forma_pagamento: 'pix', dia_cobranca: 1,
      objetivos: ['Flexibilidade', 'Reabilitação'], restricoes: null, observacoes: null,
      status: 'ativo', created_at: baseMeses(2),
    },
    {
      id: 'demo-aluno-07', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Thiago Ferreira',
      whatsapp: '11987654327', data_nascimento: '1991-12-30', data_inicio: baseMeses(5),
      emergencia_nome: null, emergencia_telefone: null, emergencia_parentesco: null,
      horarios: [{ dia: 'ter', horario: '07:00' }, { dia: 'sex', horario: '07:00' }],
      duracao: 60, local: 'Academia', endereco: null,
      modelo_cobranca: 'por_aula', valor: 150, forma_pagamento: 'pix', dia_cobranca: 12,
      objetivos: ['Hipertrofia'], restricoes: null, observacoes: null,
      status: 'ativo', created_at: baseMeses(5),
    },
    {
      id: 'demo-aluno-08', professor_id: DEMO_PROFESSOR_ID,
      nome: 'Julia Nascimento',
      whatsapp: '11987654328', data_nascimento: '1994-06-21', data_inicio: baseMeses(7),
      emergencia_nome: null, emergencia_telefone: null, emergencia_parentesco: null,
      horarios: [{ dia: 'seg', horario: '11:00' }, { dia: 'qua', horario: '11:00' }, { dia: 'sex', horario: '11:00' }],
      duracao: 60, local: 'Online', endereco: null,
      modelo_cobranca: 'mensalidade', valor: 1200, forma_pagamento: 'pix', dia_cobranca: 20,
      objetivos: ['Condicionamento'], restricoes: null, observacoes: null,
      status: 'ativo', created_at: baseMeses(7),
    },
  ]
  // Variável `hoje` reservada (nao usado aqui mas mantém parseable)
  void hoje
}

// ─── PACOTE (Carla) ───────────────────────────────────────────────────────────

export function getDemoPacotes(): DemoPacote[] {
  const inicio = daysAgo(18)
  const vencimento = daysAhead(12)
  return [
    {
      id: 'demo-pacote-01',
      professor_id: DEMO_PROFESSOR_ID,
      aluno_id: 'demo-aluno-06',
      quantidade_total: 10,
      quantidade_usada: 4, // 6 restantes
      valor: 1500,
      validade_dias: 30,
      data_inicio: inicio,
      data_vencimento: vencimento,
      data_cobranca: inicio,
      status: 'ativo',
      renovacao_de: null,
      created_at: inicio,
      updated_at: inicio,
    },
  ]
}

// ─── EVENTOS DA AGENDA (faltas registradas + aula extra + 4 consumos pacote) ──

export function getDemoEventos(): DemoEvento[] {
  const hojeD = today()
  const sabadoProximo = isoDate(nextDateForDayKey('sab', hojeD))
  const events: DemoEvento[] = []

  // 4 aulas já consumidas do pacote da Carla (demo-aluno-06) — últimas 3 semanas
  for (let i = 0; i < 4; i++) {
    const d = isoDate(addDays(hojeD, -(i + 1) * 3))
    events.push({
      id: `demo-evento-pkg-${i}`,
      professor_id: DEMO_PROFESSOR_ID,
      tipo: 'aula',
      titulo: 'Aula — Carla',
      aluno_id: 'demo-aluno-06',
      dia_semana: null,
      data_especifica: d,
      horario_inicio: '16:00',
      duracao: 60,
      cor: null,
      observacao: null,
      valor: null,
      serie_id: null,
      pacote_id: 'demo-pacote-01',
      created_at: d,
      updated_at: d,
    })
  }

  // Aula extra — Ana Silva — sábado próximo às 08:00
  events.push({
    id: 'demo-evento-extra-01',
    professor_id: DEMO_PROFESSOR_ID,
    tipo: 'aula_extra',
    titulo: 'Aula Extra — Ana',
    aluno_id: 'demo-aluno-01',
    dia_semana: null,
    data_especifica: sabadoProximo,
    horario_inicio: '08:00',
    duracao: 60,
    cor: '#FBBF24',
    observacao: null,
    valor: 180,
    serie_id: null,
    pacote_id: null,
    created_at: isoDate(hojeD),
    updated_at: isoDate(hojeD),
  })

  return events
}

// ─── FALTAS ───────────────────────────────────────────────────────────────────

export function getDemoFaltas(): DemoFalta[] {
  const hojeD = today()
  // Marina faltou na terça passada
  const terçaPassada = isoDate(lastDateForDayKey('ter', addDays(hojeD, -1)))
  // Rafael: remarcação pendente (segunda passada, vence em 5 dias)
  const segPassada = isoDate(lastDateForDayKey('seg', addDays(hojeD, -1)))
  const prazoRafael = daysAhead(5)

  return [
    {
      id: 'demo-falta-01',
      professor_id: DEMO_PROFESSOR_ID,
      aluno_id: 'demo-aluno-04', // Marina
      data_falta: terçaPassada,
      culpa: 'aluno',
      tipo: 'falta',
      horario_falta: '09:00',
      status: 'cobranca',
      credito_valor: null,
      mes_validade: null,
      prazo_vencimento: null,
      created_at: terçaPassada,
    },
    {
      id: 'demo-falta-02',
      professor_id: DEMO_PROFESSOR_ID,
      aluno_id: 'demo-aluno-05', // Rafael
      data_falta: segPassada,
      culpa: 'aluno',
      tipo: 'cancelamento',
      horario_falta: '10:00',
      status: 'pendente',
      credito_valor: null,
      mes_validade: null,
      prazo_vencimento: prazoRafael,
      created_at: segPassada,
    },
  ]
}

// ─── COBRANÇAS (mês atual) ────────────────────────────────────────────────────
// 6 pagas, 1 enviada, 1 pendente

export function getDemoCobrancas(): DemoCobranca[] {
  const mes  = mesRef(today())
  const base = daysAgo(5)
  // valores: ana 150*12=1800 (por_aula), pedro 1040, lucas 140*12=1680,
  // marina 1560, rafael 160*8=1280, carla 1500 (pacote), thiago 150*8=1200,
  // julia 1200
  const rows: DemoCobranca[] = [
    { aluno_id: 'demo-aluno-01', valor: 1800, status: 'pago' },
    { aluno_id: 'demo-aluno-02', valor: 1040, status: 'pago' },
    { aluno_id: 'demo-aluno-03', valor: 1680, status: 'pago' },
    { aluno_id: 'demo-aluno-04', valor: 1560, status: 'pago' },
    { aluno_id: 'demo-aluno-05', valor: 1280, status: 'enviado' },
    { aluno_id: 'demo-aluno-06', valor: 1500, status: 'pago' },
    { aluno_id: 'demo-aluno-07', valor: 1200, status: 'pago' },
    { aluno_id: 'demo-aluno-08', valor: 1200, status: 'pendente' },
  ].map((r, i) => ({
    id: `demo-cobranca-${i}`,
    professor_id: DEMO_PROFESSOR_ID,
    aluno_id: r.aluno_id,
    mes_referencia: mes,
    valor: r.valor,
    status: r.status as 'pendente'|'enviado'|'pago',
    mensagem: null,
    created_at: base,
  }))

  return rows
}

// ─── CUSTOS ───────────────────────────────────────────────────────────────────

export function getDemoCustos(): DemoCusto[] {
  const mes = mesRef(today())
  const base = daysAgo(10)
  return [
    { id: 'demo-custo-01', professor_id: DEMO_PROFESSOR_ID, nome: 'Academia',     valor: 1200, tipo: 'fixo',     categoria: 'Academia',     data: null, mes_referencia: mes, ativo: true, created_at: base },
    { id: 'demo-custo-02', professor_id: DEMO_PROFESSOR_ID, nome: 'Transporte',   valor: 400,  tipo: 'fixo',     categoria: 'Transporte',   data: null, mes_referencia: mes, ativo: true, created_at: base },
    { id: 'demo-custo-03', professor_id: DEMO_PROFESSOR_ID, nome: 'Aluguel',      valor: 1650, tipo: 'fixo',     categoria: 'Outros',       data: null, mes_referencia: mes, ativo: true, created_at: base },
    { id: 'demo-custo-04', professor_id: DEMO_PROFESSOR_ID, nome: 'Alimentação',  valor: 180,  tipo: 'variavel', categoria: 'Alimentação',  data: daysAgo(3), mes_referencia: mes, ativo: null, created_at: daysAgo(3) },
  ]
}

// ─── RECEITAS EXTRAS ──────────────────────────────────────────────────────────

export function getDemoReceitasExtras(): DemoReceitaExtra[] {
  const mes = mesRef(today())
  return [
    {
      id: 'demo-recex-01',
      professor_id: DEMO_PROFESSOR_ID,
      descricao: 'Consultoria de treino',
      valor: 300,
      data: daysAgo(7),
      mes_referencia: mes,
      created_at: daysAgo(7),
    },
  ]
}

// ─── HISTÓRICO FINANCEIRO (6 meses com variação realista) ─────────────────────

export function getDemoHistorico(): DemoHistoricoMes[] {
  const hojeD = today()
  const mesAtual = hojeD.getMonth()
  const ano = hojeD.getFullYear()
  const result: DemoHistoricoMes[] = []
  const custosVariation = [3400, 3550, 3300, 3480, 3200, 3430]
  const receitasExtrasVariation = [0, 200, 150, 400, 250, 300]
  for (let i = 5; i >= 0; i--) {
    let m = mesAtual - i
    let y = ano
    while (m < 0) { m += 12; y-- }
    result.push({
      mes: `${y}-${String(m + 1).padStart(2, '0')}`,
      custos: custosVariation[5 - i],
      receitas_extras: receitasExtrasVariation[5 - i],
    })
  }
  return result
}

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────

export function getDemoNotificacoes(): DemoNotificacao[] {
  return [
    {
      id: 'demo-notif-01',
      professor_id: DEMO_PROFESSOR_ID,
      tipo: 'churn',
      titulo: 'Remarcação de Rafael vence em 5 dias',
      corpo: 'Registre a remarcação antes do prazo para não perder a aula.',
      link: '/dashboard/faltas',
      lida: false,
      created_at: daysAgo(0),
    },
    {
      id: 'demo-notif-02',
      professor_id: DEMO_PROFESSOR_ID,
      tipo: 'importante',
      titulo: 'Pacote de Carla com 6 aulas restantes',
      corpo: 'Pacote vence em 12 dias.',
      link: '/dashboard/financeiro?tab=pacotes',
      lida: false,
      created_at: daysAgo(1),
    },
    {
      id: 'demo-notif-03',
      professor_id: DEMO_PROFESSOR_ID,
      tipo: 'aniversario',
      titulo: 'Ana faz aniversário em breve',
      corpo: '14 de maio.',
      link: '/dashboard/alunos/demo-aluno-01',
      lida: true,
      created_at: daysAgo(2),
    },
  ]
}

// ─── SUSPENSÕES ───────────────────────────────────────────────────────────────

export function getDemoSuspensoes(): DemoSuspensao[] {
  const inicio = daysAgo(12)
  const retorno = daysAhead(18)
  return [
    {
      id: 'demo-susp-01',
      professor_id: DEMO_PROFESSOR_ID,
      aluno_id: 'demo-aluno-07', // Thiago
      aluno_nome: 'Thiago Ferreira',
      aluno_horarios: [{ dia: 'ter', horario: '07:00' }, { dia: 'sex', horario: '07:00' }],
      tipo: 'ferias',
      status: 'ativa',
      data_inicio: inicio,
      data_retorno: retorno,
      motivo: 'Férias de fim de ano',
      acao_horario: 'liberar',
      created_at: inicio,
      updated_at: inicio,
    },
  ]
}

// ─── TERMOS (modelos + histórico) ─────────────────────────────────────────────

const DEMO_MODELO_CONTEUDO = `Olá {nome}!

📋 *TERMO DE SERVIÇO*

Bem-vindo(a) aos treinos comigo! Aqui está tudo o que você precisa saber:

🏋️ *Sobre os nossos treinos:*
• Duração: 60 minutos por sessão
• Frequência conforme combinado
• Local: Academia

✅ *O que você pode esperar de mim:*
• Avaliação inicial completa
• Treinos personalizados
• Acompanhamento constante

⚠️ *Combinados importantes:*
• Avisar cancelamento com 24h de antecedência
• Pagamento até o dia combinado

Qualquer dúvida, estou à disposição! 💪`

export function getDemoModelosTermo(): DemoModeloTermo[] {
  const base = daysAgo(60)
  return [
    {
      id: 'demo-modelo-01',
      professor_id: DEMO_PROFESSOR_ID,
      nome: 'Termo padrão',
      conteudo: DEMO_MODELO_CONTEUDO,
      tipo: 'padrao',
      created_at: base,
      updated_at: base,
    },
  ]
}

export function getDemoTermosEnviados(): DemoTermoEnviado[] {
  return [
    {
      id: 'demo-termo-01',
      professor_id: DEMO_PROFESSOR_ID,
      aluno_id: 'demo-aluno-01',
      aluno_nome: 'Ana Silva',
      conteudo: DEMO_MODELO_CONTEUDO.replace('{nome}', 'Ana'),
      modelo_usado: 'Termo padrão',
      enviado_em: daysAgo(30),
      created_at: daysAgo(30),
    },
    {
      id: 'demo-termo-02',
      professor_id: DEMO_PROFESSOR_ID,
      aluno_id: 'demo-aluno-04',
      aluno_nome: 'Marina Santos',
      conteudo: DEMO_MODELO_CONTEUDO.replace('{nome}', 'Marina'),
      modelo_usado: 'Termo padrão',
      enviado_em: daysAgo(15),
      created_at: daysAgo(15),
    },
  ]
}

// ─── PREFERÊNCIAS DE COBRANÇA ────────────────────────────────────────────────

export interface DemoPreferencias {
  chave_pix: string | null
  favorecido_pix: string | null
  link_cartao: string | null
  modelo_mensagem: string | null
  tipo_data_cobranca: string | null
}

export function getDemoPreferencias(): DemoPreferencias {
  return {
    chave_pix: 'carlos.mendes@email.com',
    favorecido_pix: 'Carlos Mendes',
    link_cartao: null,
    modelo_mensagem: null,
    tipo_data_cobranca: 'dia_aluno',
  }
}

// ─── PERFIL PROFESSOR ────────────────────────────────────────────────────────

export interface DemoPerfil {
  id: string
  professor_id: string
  nome: string
  foto_url: string | null
  cor_tema: string
  modo_tema: 'escuro' | 'claro' | 'auto'
  codigo_indicacao: string
  created_at: string
  updated_at: string
}

export function getDemoPerfil(): DemoPerfil {
  const base = daysAgo(60)
  return {
    id: 'demo-perfil-01',
    professor_id: DEMO_PROFESSOR_ID,
    nome: DEMO_PROFESSOR_NOME,
    foto_url: null,
    cor_tema: '#10B981',
    modo_tema: 'escuro',
    codigo_indicacao: 'DEMOPH01',
    created_at: base,
    updated_at: base,
  }
}
