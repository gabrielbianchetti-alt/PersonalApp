'use server'

/**
 * Guard server-side para server actions de escrita. Quando o cookie
 * `ph-demo-mode` está ativo, retorna `true` para o action terminar
 * cedo sem tocar no banco.
 */

import { isDemoMode } from './mode'

export async function shouldBlockInDemo(): Promise<boolean> {
  return isDemoMode()
}
