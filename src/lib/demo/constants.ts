/**
 * Sentinel retornado por server actions quando bloqueadas em modo demo.
 * Clientes detectam esse valor no campo `error` e disparam um toast
 * "Ação simulada no modo demo".
 */
export const DEMO_ERROR_SENTINEL = 'DEMO_MODE_SIMULATED'
