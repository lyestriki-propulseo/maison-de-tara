import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'
import { DEFAULT_HOURS, hoursSchema, parseHours } from '@/lib/site-settings'

// Données éditoriales du site (horaires, plus tard : événements) pilotées par Tara.
// Lecture/écriture côté SERVEUR via service_role. Le site public lit certaines clés en anon (RLS).

function throwDatabaseError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

// Horaires d'ouverture de la maison (clé site_settings 'hours'). Renvoie le défaut si absent.
export const getSiteHours = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('site_settings')
    .select('value')
    .eq('key', 'hours')
    .maybeSingle()

  throwDatabaseError(error, 'Impossible de charger les horaires')
  return parseHours(data?.value ?? DEFAULT_HOURS)
})

export const saveSiteHours = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(hoursSchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { error } = await db
      .from('site_settings')
      .upsert({ key: 'hours', value: data }, { onConflict: 'key' })
    throwDatabaseError(error, 'Impossible d’enregistrer les horaires')
    return { saved: true }
  })
