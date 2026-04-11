'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type LoginState = { error?: string } | null

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha todos os campos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'E-mail ou senha incorretos.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Confirme seu e-mail antes de entrar.' }
    }
    return { error: 'Erro ao fazer login. Tente novamente.' }
  }

  redirect('/dashboard')
}
