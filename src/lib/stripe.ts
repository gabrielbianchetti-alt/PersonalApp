import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
})

export const PRICE_IDS = {
  mensal: process.env.STRIPE_PRICE_MENSAL!,
  anual:  process.env.STRIPE_PRICE_ANUAL!,
} as const

export type Plano = keyof typeof PRICE_IDS
