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
