'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type RegisterState = { error?: string } | null

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!name || !email || !password || !confirmPassword) {
    return { error: 'Preencha todos os campos.' }
  }

  if (name.length < 2) {
    return { error: 'Informe seu nome completo.' }
  }

  if (password.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres.' }
  }

  if (password !== confirmPassword) {
    return { error: 'As senhas não coincidem.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  redirect('/register/success')
}
