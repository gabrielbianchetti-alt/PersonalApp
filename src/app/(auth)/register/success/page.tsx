import type { Metadata } from 'next'
import { SuccessContent } from './SuccessContent'

export const metadata: Metadata = {
  title: 'Cadastro realizado — PersonalHub',
}

export default function RegisterSuccessPage() {
  return <SuccessContent />
}
