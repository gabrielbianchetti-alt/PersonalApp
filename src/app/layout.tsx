import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'PersonalHub — Gestão para Personal Trainers',
  description: 'Plataforma completa para personal trainers gerenciarem alunos, treinos e evolução.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read theme cookie set when user saves preferences — avoids flash on every page
  const cookieStore = await cookies()
  const modo = (cookieStore.get('ph-modo')?.value ?? 'escuro') as 'escuro' | 'claro' | 'auto'

  return (
    <html lang="pt-BR" data-theme={modo} className={`${geist.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
