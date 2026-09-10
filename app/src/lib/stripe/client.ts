import Stripe from 'stripe'
import { env } from '@/env'

let cached: Stripe | null = null

export function stripeClient(): Stripe {
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY)
  }
  return cached
}
