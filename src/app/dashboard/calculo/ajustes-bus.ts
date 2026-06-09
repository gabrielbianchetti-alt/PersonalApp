// Barramento client-side para sincronizar o ajuste manual entre Cálculo e
// Cobrança ao vivo (mesma aba do navegador / mesmo FinanceiroHub), sem
// round-trip no servidor. O Cálculo emite ao gravar; a Cobrança escuta e
// atualiza o estado dela na hora, respeitando o mês exibido.
//
// Cobertura: abas do hub e troca de aba na mesma janela. Para sincronizar
// entre janelas/dispositivos diferentes seria preciso Supabase Realtime
// (linha opcional na migration ajustes-aulas-schema.sql) — fora deste escopo.

export interface AjusteEvent {
  mesRef: string
  alunoId: string
  /** Nova contagem ajustada, ou null quando o ajuste foi removido. */
  aulas: number | null
}

type Listener = (e: AjusteEvent) => void

const listeners = new Set<Listener>()

export function emitAjuste(e: AjusteEvent): void {
  for (const l of listeners) l(e)
}

export function subscribeAjustes(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
