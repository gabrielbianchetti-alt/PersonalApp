import Stripe from 'stripe'

export const PRICE_IDS = {
  mensal: process.env.STRIPE_PRICE_MENSAL ?? '',
  anual:  process.env.STRIPE_PRICE_ANUAL  ?? '',
} as const

export type Plano = keyof typeof PRICE_IDS

// Lazy singleton — only instantiated when first needed (not at module load)
// This avoids crashes when STRIPE_SECRET_KEY is absent during build or
// when API routes are pre-imported by the bundler.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY environment variable.')
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia', typescript: true })
  }
  return _stripe
}
