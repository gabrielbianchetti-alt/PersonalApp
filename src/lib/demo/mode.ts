/**
 * Server-side helpers para detectar e alternar o Modo Demonstração.
 * O cookie `ph-demo-mode=1` sinaliza que o professor está explorando
 * com dados fictícios. Nenhum dado é salvo no banco — apenas lido
 * dos fixtures em `./fixtures.ts`.
 */

import { cookies } from 'next/headers'

export const DEMO_COOKIE = 'ph-demo-mode'

/** Ativa: retorna true se o cookie está setado */
export async function isDemoMode(): Promise<boolean> {
  const store = await cookies()
  return store.get(DEMO_COOKIE)?.value === '1'
}
