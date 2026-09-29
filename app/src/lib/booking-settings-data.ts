import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'
import {
  ATELIER_DEPOSIT_KEY,
  atelierDepositSchema,
  parseAtelierDepositCents,
} from '@/lib/booking-settings'

// Lecture serveur (service_role) de l'acompte atelier : utilisée par le paiement en ligne.
export async function readAtelierDepositCents(db: ReturnType<typeof supabaseAdmin>) {
  const { data, error } = await db
    .from('site_settings')
    .select('value')
    .eq('key', ATELIER_DEPOSIT_KEY)
    .maybeSingle()
  if (error) throw new Error(error.message || 'Impossible de lire l’acompte atelier')
  return parseAtelierDepositCents(data?.value ?? null)
}

export const getAtelierDeposit = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => ({ cents: await readAtelierDepositCents(supabaseAdmin()) }))

export const saveAtelierDeposit = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(atelierDepositSchema)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin()
      .from('site_settings')
      .upsert({ key: ATELIER_DEPOSIT_KEY, value: data }, { onConflict: 'key' })
    if (error) throw new Error(error.message || 'Impossible d’enregistrer l’acompte')
    return { saved: true }
  })
