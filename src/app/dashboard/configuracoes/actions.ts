'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ModoTema, ProfessorPerfil } from './types'

// ─── get or create ────────────────────────────────────────────────────────────

export async function getOrCreatePerfilAction(): Promise<{
  data?: ProfessorPerfil
  email?: string
  error?: string
}> {
  // Use user-scoped client only for auth verification
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sessão expirada.' }

  // Use admin client to bypass RLS — safe because we scope all queries to user.id
  let admin
  try {
    admin = createAdminClient()
  } catch {
    // Fallback to user-scoped client if service role key is not set
    admin = supabase
  }

  const { data: existing } = await admin
    .from('professor_perfil')
    .select('*')
    .eq('professor_id', user.id)
    .maybeSingle()

  if (existing) return { data: existing as ProfessorPerfil, email: user.email }

  // First time — create profile with a unique referral code
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  const codigo = 'PH' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()

  // Try full insert first (with codigo_indicacao)
  let { data: newRow, error: insertError } = await admin
    .from('professor_perfil')
    .insert({
      professor_id: user.id,
      nome: (user.user_metadata?.full_name as string | undefined) ?? '',
      cor_tema: '#00E676',
      modo_tema: 'escuro',
      codigo_indicacao: codigo,
    })
    .select()
    .single()

  // If column doesn't exist in the DB yet, retry without it
  if (insertError && (insertError.code === '42703' || insertError.message?.includes('codigo_indicacao'))) {
    console.warn('getOrCreatePerfil: retrying without codigo_indicacao column')
    ;({ data: newRow, error: insertError } = await admin
      .from('professor_perfil')
      .insert({
        professor_id: user.id,
        nome: (user.user_metadata?.full_name as string | undefined) ?? '',
        cor_tema: '#00E676',
        modo_tema: 'escuro',
      })
      .select()
      .single())
  }

  if (insertError) {
    console.error('getOrCreatePerfil — code:', insertError.code)
    console.error('getOrCreatePerfil — message:', insertError.message)
    console.error('getOrCreatePerfil — details:', insertError.details)
    console.error('getOrCreatePerfil — hint:', insertError.hint)
    return { error: `Erro ao criar perfil: ${insertError.message ?? 'desconhecido'}` }
  }

  return { data: newRow as ProfessorPerfil, email: user.email }
}

// ─── helper: get auth user + admin db client ──────────────────────────────────

async function getAuthAndAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { user: null, supabase, admin: supabase }
  let admin
  try { admin = createAdminClient() } catch { admin = supabase }
  return { user, supabase, admin }
}

// ─── save nome ────────────────────────────────────────────────────────────────

export async function saveNomeAction(nome: string): Promise<{ error?: string }> {
  const { user, supabase, admin } = await getAuthAndAdmin()
  if (!user) return { error: 'Sessão expirada.' }

  const { error } = await admin
    .from('professor_perfil')
    .update({ nome: nome.trim() })
    .eq('professor_id', user.id)

  if (error) { console.error('saveNome:', error); return { error: 'Erro ao salvar nome.' } }

  // Also update auth user metadata so the name shows correctly everywhere
  await supabase.auth.updateUser({ data: { full_name: nome.trim() } })

  revalidatePath('/dashboard', 'layout')
  return {}
}

// ─── save foto URL ────────────────────────────────────────────────────────────

export async function saveFotoUrlAction(url: string): Promise<{ error?: string }> {
  const { user, admin } = await getAuthAndAdmin()
  if (!user) return { error: 'Sessão expirada.' }

  const { error } = await admin
    .from('professor_perfil')
    .update({ foto_url: url })
    .eq('professor_id', user.id)

  if (error) { console.error('saveFotoUrl:', error); return { error: 'Erro ao salvar foto.' } }

  revalidatePath('/dashboard', 'layout')
  return {}
}

// ─── save cor tema ────────────────────────────────────────────────────────────

export async function saveCorTemaAction(cor: string): Promise<{ error?: string }> {
  if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) return { error: 'Cor inválida.' }

  const { user, admin } = await getAuthAndAdmin()
  if (!user) return { error: 'Sessão expirada.' }

  const { error } = await admin
    .from('professor_perfil')
    .update({ cor_tema: cor })
    .eq('professor_id', user.id)

  if (error) { console.error('saveCorTema:', error); return { error: 'Erro ao salvar cor.' } }

  revalidatePath('/dashboard', 'layout')
  return {}
}

// ─── save modo tema ───────────────────────────────────────────────────────────

export async function saveModoTemaAction(modo: ModoTema): Promise<{ error?: string }> {
  if (!['escuro', 'claro', 'auto'].includes(modo)) return { error: 'Modo inválido.' }

  const { user, admin } = await getAuthAndAdmin()
  if (!user) return { error: 'Sessão expirada.' }

  const { error } = await admin
    .from('professor_perfil')
    .update({ modo_tema: modo })
    .eq('professor_id', user.id)

  if (error) { console.error('saveModoTema:', error); return { error: 'Erro ao salvar modo.' } }

  // Persist in cookie so the root layout can apply the theme server-side (no flash)
  const cookieStore = await cookies()
  cookieStore.set('ph-modo', modo, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  revalidatePath('/dashboard', 'layout')
  return {}
}
