'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { DEMO_COOKIE } from './mode'

const ONE_DAY = 60 * 60 * 24

export async function ativarDemoAction(): Promise<void> {
  const store = await cookies()
  store.set(DEMO_COOKIE, '1', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_DAY, // 24h, tempo suficiente pra explorar
  })
  revalidatePath('/', 'layout')
}

export async function desativarDemoAction(): Promise<void> {
  const store = await cookies()
  store.delete(DEMO_COOKIE)
  revalidatePath('/', 'layout')
}
