'use server'

import { createClient } from '@/lib/supabase/server'

type ForgotState = { error?: string; success?: boolean } | null

export async function forgotPasswordAction(_prevState: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    return { error: 'Informe seu e-mail.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    return { error: 'Erro ao enviar e-mail. Tente novamente.' }
  }

  return { success: true }
}
