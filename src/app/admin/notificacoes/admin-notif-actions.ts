'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ADMIN_EMAILS } from '@/lib/constants'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) throw new Error('Não autorizado')
  return user
}

export type NotifDestinatarios = 'todos' | 'assinantes' | 'trial' | 'manual'

export interface CriarNotifAdminInput {
  titulo: string
  mensagem: string
  categoria: 'info' | 'importante' | 'urgente'
  destinatarios: NotifDestinatarios
  usuariosManual?: string[]  // array of user IDs
}

export async function criarNotificacaoAdminAction(
  input: CriarNotifAdminInput
): Promise<{ error?: string; count?: number }> {
  const adminUser = await checkAdmin()
  const admin = createAdminClient()

  // Determine target user IDs
  let targetIds: string[] = []

  if (input.destinatarios === 'todos') {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    targetIds = users.map(u => u.id)
  } else if (input.destinatarios === 'assinantes') {
    const { data } = await admin
      .from('assinaturas')
      .select('professor_id')
      .eq('status', 'active')
    targetIds = (data ?? []).map((r: { professor_id: string }) => r.professor_id)
  } else if (input.destinatarios === 'trial') {
    const { data } = await admin
      .from('assinaturas')
      .select('professor_id')
      .eq('status', 'trial')
    targetIds = (data ?? []).map((r: { professor_id: string }) => r.professor_id)
  } else if (input.destinatarios === 'manual') {
    targetIds = input.usuariosManual ?? []
  }

  if (targetIds.length === 0) return { error: 'Nenhum destinatário encontrado.' }

  // Create the notification
  const { data: notif, error: notifError } = await admin
    .from('notificacoes')
    .insert({
      tipo: 'admin',
      categoria: input.categoria,
      titulo: input.titulo,
      mensagem: input.mensagem,
      link: null,
      remetente_id: adminUser.id,
    })
    .select('id')
    .single()

  if (notifError || !notif) {
    console.error('criarNotifAdmin:', notifError)
    return { error: 'Erro ao criar notificação.' }
  }

  // Insert user links in batches
  const batchSize = 100
  for (let i = 0; i < targetIds.length; i += batchSize) {
    const batch = targetIds.slice(i, i + batchSize)
    const rows = batch.map(uid => ({
      notificacao_id: notif.id,
      usuario_id: uid,
      lida: false,
      dedup_key: null,
    }))
    await admin.from('notificacoes_usuario').insert(rows)
  }

  revalidatePath('/admin/notificacoes')
  return { count: targetIds.length }
}

export interface AdminNotifHistorico {
  id: string
  titulo: string
  mensagem: string
  categoria: string
  created_at: string
  total_enviado: number
  total_lido: number
}

export async function fetchAdminNotificacoesAction(): Promise<{
  data?: AdminNotifHistorico[]
  error?: string
}> {
  await checkAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('notificacoes')
    .select('id, titulo, mensagem, categoria, created_at')
    .eq('tipo', 'admin')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return { error: 'Erro ao buscar notificações.' }
  if (!data?.length) return { data: [] }

  // Single query to aggregate deliveries and reads — replaces N×2 queries
  const notifIds = data.map((n: { id: string }) => n.id)
  const { data: statsRows } = await admin
    .from('notificacoes_usuario')
    .select('notificacao_id, lida')
    .in('notificacao_id', notifIds)

  // Aggregate in JS
  const statsMap: Record<string, { total: number; lido: number }> = {}
  for (const row of (statsRows ?? []) as { notificacao_id: string; lida: boolean }[]) {
    if (!statsMap[row.notificacao_id]) statsMap[row.notificacao_id] = { total: 0, lido: 0 }
    statsMap[row.notificacao_id].total++
    if (row.lida) statsMap[row.notificacao_id].lido++
  }

  const historico: AdminNotifHistorico[] = (data as { id: string; titulo: string; mensagem: string; categoria: string; created_at: string }[]).map(n => ({
    ...n,
    total_enviado: statsMap[n.id]?.total ?? 0,
    total_lido:    statsMap[n.id]?.lido  ?? 0,
  }))

  return { data: historico }
}

export async function excluirNotificacaoAdminAction(
  notifId: string
): Promise<{ error?: string }> {
  await checkAdmin()
  const admin = createAdminClient()

  // ON DELETE CASCADE handles notificacoes_usuario
  const { error } = await admin
    .from('notificacoes')
    .delete()
    .eq('id', notifId)
    .eq('tipo', 'admin')

  if (error) { console.error('excluirNotif:', error); return { error: 'Erro ao excluir.' } }
  revalidatePath('/admin/notificacoes')
  return {}
}

export async function fetchAllProfessoresAction(): Promise<{
  data?: { id: string; email: string; nome: string }[]
  error?: string
}> {
  await checkAdmin()
  const admin = createAdminClient()

  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return { error: 'Erro ao buscar usuários.' }

  const { data: perfis } = await admin
    .from('professor_perfil')
    .select('professor_id, nome')
  const perfilMap: Record<string, string> = {}
  for (const p of perfis ?? []) perfilMap[p.professor_id] = p.nome

  return {
    data: users.map(u => ({
      id: u.id,
      email: u.email ?? '',
      nome: perfilMap[u.id] ?? u.email?.split('@')[0] ?? u.id,
    }))
  }
}
