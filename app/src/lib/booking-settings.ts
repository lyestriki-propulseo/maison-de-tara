import { z } from 'zod'

// Acompte de l'atelier libre, par personne, réglable par Tara (demande du 28/09). Stocké dans
// site_settings sous une clé NON publique : seul le serveur le lit (création du paiement Stripe).
export const ATELIER_DEPOSIT_KEY = 'atelier_deposit'
export const DEFAULT_ATELIER_DEPOSIT_CENTS = 600

export const atelierDepositSchema = z.object({
  cents: z.number().int().min(0).max(10000),
})

export type AtelierDeposit = z.infer<typeof atelierDepositSchema>

export function parseAtelierDepositCents(value: unknown): number {
  const parsed = atelierDepositSchema.safeParse(value)
  return parsed.success ? parsed.data.cents : DEFAULT_ATELIER_DEPOSIT_CENTS
}
