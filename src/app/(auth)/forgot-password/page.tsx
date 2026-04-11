import type { Metadata } from 'next'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Recuperar Senha — PersonalHub',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
