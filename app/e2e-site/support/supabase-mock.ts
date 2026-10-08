import type { Page, Route } from '@playwright/test'

// Simule les réponses Supabase du site public : les tests du site ne lisent ni n'écrivent
// jamais la base de production (seule base existante).

export type ContentRow = {
  field_key: string
  field_type: 'text'
  text_value: string | null
}

export type AvailabilityEvent = {
  id: string
  title: string
  starts_at: string
  availability: 'disponible' | 'presque_complet' | 'complet'
  price_cents: number | null
}

export type SupabaseMock = {
  /** Lignes content_blocks par page (`global`, `atelier`, `mentions-legales`…). */
  content?: Partial<Record<string, ContentRow[]>>
  events?: AvailabilityEvent[]
  /** Retard (ms) de la réponse content_blocks, pour rejouer les courses entre requêtes. */
  contentDelayMs?: number
  /** Retard (ms) des disponibilités (créneaux + événements). */
  availabilityDelayMs?: number
  /** Supabase injoignable : toutes les requêtes échouent. */
  down?: boolean
}

const wait = (ms = 0) => new Promise<void>((done) => setTimeout(done, ms))

function json(route: Route, body: unknown): Promise<void> {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
}

export async function mockSupabase(page: Page, mock: SupabaseMock = {}): Promise<void> {
  // Polices Google : inutiles aux tests, coupées pour ne dépendre d'aucun réseau.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.route(/\.supabase\.co\/rest\/v1\//, async (route) => {
    if (mock.down) return route.abort()
    const url = new URL(route.request().url())
    const resource = url.pathname.split('/rest/v1/')[1] ?? ''
    if (resource === 'content_blocks') {
      const pageName = (url.searchParams.get('page') ?? '').replace(/^eq\./, '')
      await wait(mock.contentDelayMs)
      return json(route, mock.content?.[pageName] ?? [])
    }
    if (resource === 'public_availability_events') {
      await wait(mock.availabilityDelayMs)
      return json(route, mock.events ?? [])
    }
    if (resource === 'public_availability') {
      await wait(mock.availabilityDelayMs)
      return json(route, [])
    }
    if (resource === 'rpc/check_availability') return json(route, true)
    return json(route, [])
  })
}
