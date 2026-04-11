import type { Metadata } from 'next'
import { NovoAlunoForm } from './NovoAlunoForm'

export const metadata: Metadata = {
  title: 'Novo Aluno — PersonalHub',
}

export default function NovoAlunoPage() {
  return <NovoAlunoForm />
}
