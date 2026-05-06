'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AlunoFormData } from '@/types/aluno'
import { shouldBlockInDemo } from '@/lib/demo/guard'
import { DEMO_ERROR_SENTINEL } from '@/lib/demo/constants'

export async function updateAlunoAction(
  alunoId: string,
  data: AlunoFormData
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  const isPacote = data.modelo_cobranca === 'pacote'

  // ── Aulas em Dupla (Etapa 3) ─────────────────────────────────────────────
  // Lê o estado ATUAL deste aluno para descobrir qual era o parceiro antigo.
  // Necessário para sincronizar mudanças bidirecionais (mudou de B para C →
  // libera B; removeu dupla → libera B).
  let parceiroAntigoId: string | null = null
  {
    const { data: atual, error: atualErr } = await supabase
      .from('alunos')
      .select('parceiro_id')
      .eq('id', alunoId)
      .eq('professor_id', user.id)
      .maybeSingle()
    if (!atualErr && atual && 'parceiro_id' in atual) {
      parceiroAntigoId = (atual as { parceiro_id: string | null }).parceiro_id ?? null
    }
    // Se a coluna não existe ainda, parceiroAntigoId fica null — comportamento OK.
  }

  const novoParceiroId = (data.parceiro_id ?? '').trim() || null
  const dupla = novoParceiroId
    ? {
        parceiro_id:      novoParceiroId,
        frequencia_dupla: data.frequencia_dupla ?? 'sempre',
        dias_dupla:       data.dias_dupla && data.dias_dupla.length > 0 ? data.dias_dupla : null,
        valor_aula_dupla: data.valor_aula_dupla ? parseFloat(data.valor_aula_dupla) : null,
      }
    : null

  // Validação: só bloqueia em casos claros. Caso a leitura do parceiro falhe
  // ou retorne null, deixamos o save tentar — a FK do banco vai recusar IDs
  // realmente inválidos com erro mais útil que um pre-check baseado em cache.
  if (dupla && dupla.parceiro_id !== parceiroAntigoId) {
    if (dupla.parceiro_id === alunoId) {
      return { error: 'Um aluno não pode ser parceiro de dupla de si mesmo.' }
    }
    const { data: parceiro, error: pErr } = await supabase
      .from('alunos')
      .select('id, nome, parceiro_id')
      .eq('id', dupla.parceiro_id)
      .eq('professor_id', user.id)
      .maybeSingle()
    if (pErr) {
      console.warn('updateAluno: pre-check do parceiro falhou (segue mesmo assim):', pErr.code, pErr.message)
    } else if (parceiro && parceiro.parceiro_id && parceiro.parceiro_id !== alunoId) {
      return { error: `${parceiro.nome} já está em dupla com outro aluno. Desfaça a dupla atual primeiro.` }
    }
  }

  const baseUpdate = {
    nome: data.nome.trim(),
    whatsapp: data.whatsapp.replace(/\D/g, ''),
    data_nascimento: data.data_nascimento || null,
    data_inicio: data.data_inicio || null,
    emergencia_nome: data.emergencia_nome.trim() || null,
    emergencia_telefone: data.emergencia_telefone.replace(/\D/g, '') || null,
    emergencia_parentesco: data.emergencia_parentesco.trim() || null,
    horarios: isPacote ? [] : data.horarios,
    duracao: parseInt(data.duracao) || null,
    local: data.local || null,
    endereco: data.endereco.trim() || null,
    modelo_cobranca: data.modelo_cobranca,
    valor: parseFloat(data.valor),
    dia_cobranca: parseInt(data.dia_cobranca) || 1,
    objetivos: data.objetivos,
    restricoes: data.restricoes.trim() || null,
    observacoes: data.observacoes.trim() || null,
  }

  // Update payload inclui campos de dupla (sempre enviados, mesmo que NULL,
  // para que "remover dupla" seja persistido).
  const fullUpdate = {
    ...baseUpdate,
    parceiro_id:      dupla?.parceiro_id      ?? null,
    frequencia_dupla: dupla?.frequencia_dupla ?? null,
    dias_dupla:       dupla?.dias_dupla       ?? null,
    valor_aula_dupla: dupla?.valor_aula_dupla ?? null,
  }

  let { error } = await supabase
    .from('alunos')
    .update(fullUpdate)
    .eq('id', alunoId)
    .eq('professor_id', user.id)

  // Fallback: colunas de dupla não existem ainda → salva sem elas.
  if (error && isColumnMissing(error)) {
    const retry = await supabase
      .from('alunos')
      .update(baseUpdate)
      .eq('id', alunoId)
      .eq('professor_id', user.id)
    error = retry.error
  }

  if (error) {
    console.error('updateAluno:', {
      code: error.code, message: error.message, details: error.details, hint: error.hint,
    })
    const parts: string[] = []
    if (error.message) parts.push(error.message)
    if (error.details) parts.push(error.details)
    if (error.hint)    parts.push(`Dica: ${error.hint}`)
    return { error: `Erro ao atualizar aluno: ${parts.join(' — ') || 'tente novamente.'}` }
  }

  // ── Sincronização bidirecional ────────────────────────────────────────────
  //   1) Se removeu/trocou parceiro: libera o parceiro antigo (parceiro_id=NULL)
  //   2) Se tem novo parceiro: garante que ele aponta para nós e tem mesma config
  if (parceiroAntigoId && parceiroAntigoId !== novoParceiroId) {
    const { error: e1 } = await supabase
      .from('alunos')
      .update({ parceiro_id: null, frequencia_dupla: null, dias_dupla: null, valor_aula_dupla: null })
      .eq('id', parceiroAntigoId)
      .eq('professor_id', user.id)
    if (e1 && !isColumnMissing(e1)) console.error('updateAluno libera parceiro antigo:', e1)
  }
  if (dupla) {
    const { error: e2 } = await supabase
      .from('alunos')
      .update({
        parceiro_id:      alunoId,
        frequencia_dupla: dupla.frequencia_dupla,
        dias_dupla:       dupla.dias_dupla,
        valor_aula_dupla: dupla.valor_aula_dupla,
      })
      .eq('id', dupla.parceiro_id)
      .eq('professor_id', user.id)
    if (e2 && !isColumnMissing(e2)) console.error('updateAluno sincroniza novo parceiro:', e2)
  }

  revalidatePath(`/dashboard/alunos/${alunoId}`)
  revalidatePath('/dashboard/alunos')
  return {}
}

function isColumnMissing(err: { code?: string | null; message?: string | null } | null): boolean {
  if (!err) return false
  if (err.code === '42703') return true
  if (err.code === 'PGRST204') return true
  if (err.code === 'PGRST205') return true
  const msg = err.message ?? ''
  return msg.includes('does not exist') || msg.includes('Could not find the')
}

export async function deleteAlunoAction(
  alunoId: string
): Promise<{ error?: string }> {
  if (await shouldBlockInDemo()) return { error: DEMO_ERROR_SENTINEL }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Confirm the aluno belongs to this professor before touching anything
  const { data: aluno } = await supabase
    .from('alunos')
    .select('id')
    .eq('id', alunoId)
    .eq('professor_id', user.id)
    .single()

  if (!aluno) return { error: 'Aluno não encontrado.' }

  // Delete all related records in parallel
  const tables = [
    'faltas', 'cobrancas', 'termos_enviados', 'suspensoes', 'eventos_agenda', 'pacotes',
  ] as const

  await Promise.all(
    tables.map(table =>
      supabase.from(table).delete().eq('aluno_id', alunoId).eq('professor_id', user.id)
    )
  )

  // Finally delete the aluno record
  const { error } = await supabase
    .from('alunos')
    .delete()
    .eq('id', alunoId)
    .eq('professor_id', user.id)

  if (error) {
    console.error('deleteAluno:', error)
    return { error: `Erro ao excluir aluno: ${error.message}` }
  }

  return {}
}
