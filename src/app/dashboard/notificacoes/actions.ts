'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { NotificacaoComLeitura } from '@/types/notificacao'

export async function fetchNotificacoesAction(): Promise<{
  data?: NotificacaoComLeitura[]
  unreadCount?: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('notificacoes_usuario')
    .select(`
      id, notificacao_id, usuario_id, lida, lida_em, created_at,
      notificacao:notificacoes(id, tipo, categoria, titulo, mensagem, link, remetente_id, created_at)
    `)
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('fetchNotificacoes:', error)
    return { error: 'Erro ao buscar notificações.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notificacoes = ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    notificacao_id: row.notificacao_id,
    usuario_id: row.usuario_id,
    lida: row.lida,
    lida_em: row.lida_em,
    created_at: row.created_at,
    notificacao: row.notificacao,
  })) as NotificacaoComLeitura[]

  const unreadCount = notificacoes.filter(n => !n.lida).length
  return { data: notificacoes, unreadCount }
}

export async function marcarLidaAction(notifUsuarioId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('notificacoes_usuario')
    .update({ lida: true, lida_em: new Date().toISOString() })
    .eq('id', notifUsuarioId)
    .eq('usuario_id', user.id)

  if (error) { console.error('marcarLida:', error); return { error: 'Erro.' } }
  revalidatePath('/dashboard')
  return {}
}

export async function marcarTodasLidasAction(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('notificacoes_usuario')
    .update({ lida: true, lida_em: new Date().toISOString() })
    .eq('usuario_id', user.id)
    .eq('lida', false)

  if (error) { console.error('marcarTodasLidas:', error); return { error: 'Erro.' } }
  revalidatePath('/dashboard')
  return {}
}

export async function fetchUnreadCountAction(): Promise<{ count: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0 }

  const { count, error } = await supabase
    .from('notificacoes_usuario')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', user.id)
    .eq('lida', false)

  if (error) return { count: 0 }
  return { count: count ?? 0 }
}
