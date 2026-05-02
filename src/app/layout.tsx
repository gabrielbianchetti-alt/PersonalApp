import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { cookies } from 'next/headers'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'PersonalHub — Gestão para Personal Trainers',
  description: 'Plataforma completa para personal trainers gerenciarem alunos, treinos e evolução.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read theme cookie set when user saves preferences — avoids flash on every page
  const cookieStore = await cookies()
  const modo = (cookieStore.get('ph-modo')?.value ?? 'escuro') as 'escuro' | 'claro' | 'auto'

  return (
    <html lang="pt-BR" data-theme={modo} className={`${geist.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
