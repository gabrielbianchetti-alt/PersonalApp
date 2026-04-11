'use server'

import { createClient } from '@/lib/supabase/server'

// ─── types ────────────────────────────────────────────────────────────────────

export type ModeloTipo = 'formal' | 'descontraido' | 'personalizado'

export interface ModeloTermo {
  id: string
  professor_id: string
  nome: string
  conteudo: string
  tipo: ModeloTipo
  created_at: string
  updated_at: string
}

export interface TermoEnviado {
  id: string
  professor_id: string
  aluno_id: string
  conteudo: string
  modelo_usado: ModeloTipo
  enviado_em: string
  created_at: string
  // joined
  aluno_nome?: string
}

// ─── default templates ────────────────────────────────────────────────────────

export const MODELO_FORMAL_CONTEUDO = `Olá, {nome}!

Seguem os termos do nosso serviço de Personal Training:

━━━━━━━━━━━━━━━━
📋 TERMO DE SERVIÇO
━━━━━━━━━━━━━━━━

*Aluno(a):* {nome}
*Dias de treino:* {dias}
*Horário:* {horario}
*Local:* {local}
*Valor:* {valor}
*Início:* {inicio}

*SERVIÇOS PRESTADOS*
• Planejamento e periodização individualizada
• Acompanhamento presencial em todas as sessões
• Ajuste de cargas e exercícios conforme evolução
• Suporte por mensagem nos dias de treino

*CANCELAMENTOS E FALTAS*
• Cancelamentos com menos de 2h de antecedência serão cobrados normalmente
• Reposições sujeitas à disponibilidade de agenda

*PAGAMENTO*
• Conforme valor acordado acima
• Pagamento até o 5º dia útil do mês

Ao prosseguir com os treinos, você concorda com os termos acima.

Qualquer dúvida, estou à disposição! 💪`

export const MODELO_DESCONTRAIDO_CONTEUDO = `Oi, {nome}! 😄

Antes de começarmos, quero te passar alguns combinados da nossa parceria:

🏋️ *Sobre os nossos treinos:*
• Dias: {dias}
• Horário: {horario}
• Local: {local}
• Valor: {valor}
• Começa em: {inicio}

✅ *O que você pode esperar de mim:*
• Treinos planejados do zero pra você
• Atenção total durante as sessões
• Disponível pra dúvidas nos dias de treino

⚠️ *Combinados importantes:*
• Cancelamentos com menos de 2h de antecedência são cobrados normalmente
• Reposições a combinar conforme nossa disponibilidade

É simples assim! Se estiver de acordo, é só me confirmar e a gente começa na data combinada. 🚀

Qualquer dúvida é só perguntar!`

// ─── seed defaults ────────────────────────────────────────────────────────────

export async function seedModelosIfNeeded(professorId: string): Promise<void> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('modelos_termo')
    .select('id')
    .eq('professor_id', professorId)
    .limit(1)

  if (existing && existing.length > 0) return

  await supabase.from('modelos_termo').insert([
    {
      professor_id: professorId,
      nome: 'Formal',
      conteudo: MODELO_FORMAL_CONTEUDO,
      tipo: 'formal',
    },
    {
      professor_id: professorId,
      nome: 'Descontraído',
      conteudo: MODELO_DESCONTRAIDO_CONTEUDO,
      tipo: 'descontraido',
    },
  ])
}

// ─── modelos ──────────────────────────────────────────────────────────────────

export async function getModelosAction(): Promise<{ data?: ModeloTermo[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('modelos_termo')
    .select('*')
    .eq('professor_id', user.id)
    .order('created_at')

  if (error) { console.error('getModelos:', error); return { error: 'Erro ao buscar modelos.' } }
  return { data: (data ?? []) as ModeloTermo[] }
}

export async function saveModeloAction(
  input: { id?: string; nome: string; conteudo: string; tipo: ModeloTipo }
): Promise<{ data?: ModeloTermo; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  if (input.id) {
    const { data: row, error } = await supabase
      .from('modelos_termo')
      .update({ nome: input.nome, conteudo: input.conteudo, updated_at: new Date().toISOString() })
      .eq('id', input.id)
      .eq('professor_id', user.id)
      .select()
      .single()
    if (error) { console.error('updateModelo:', error); return { error: 'Erro ao salvar modelo.' } }
    return { data: row as ModeloTermo }
  }

  const { data: row, error } = await supabase
    .from('modelos_termo')
    .insert({ professor_id: user.id, nome: input.nome, conteudo: input.conteudo, tipo: input.tipo })
    .select()
    .single()
  if (error) { console.error('createModelo:', error); return { error: 'Erro ao criar modelo.' } }
  return { data: row as ModeloTermo }
}

// ─── envios ───────────────────────────────────────────────────────────────────

export async function getHistoricoAction(): Promise<{ data?: TermoEnviado[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('termos_enviados')
    .select('*, alunos(nome)')
    .eq('professor_id', user.id)
    .order('enviado_em', { ascending: false })

  if (error) { console.error('getHistorico:', error); return { error: 'Erro ao buscar histórico.' } }

  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    aluno_nome: (r.alunos as { nome: string } | null)?.nome ?? '—',
  })) as TermoEnviado[]

  return { data: rows }
}

export async function registrarEnvioAction(input: {
  aluno_id: string
  conteudo: string
  modelo_usado: ModeloTipo
}): Promise<{ data?: TermoEnviado; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const { data: row, error } = await supabase
    .from('termos_enviados')
    .insert({
      professor_id: user.id,
      aluno_id: input.aluno_id,
      conteudo: input.conteudo,
      modelo_usado: input.modelo_usado,
      enviado_em: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) { console.error('registrarEnvio:', error); return { error: 'Erro ao registrar envio.' } }
  return { data: row as TermoEnviado }
}
