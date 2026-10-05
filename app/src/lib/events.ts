import { z } from 'zod'

// Événements du « programme de la maison » (ateliers, soirées, kids…). Édités par Tara,
// affichés sur le site (calendrier + accueil), réservables en ligne (Phase 4).

export const EVENT_TYPES = [
  { value: 'workshop', label: 'Atelier' },
  { value: 'soiree', label: 'Soirée' },
  { value: 'kids', label: 'Enfants' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'autre', label: 'Autre' },
] as const

export type EventType = (typeof EVENT_TYPES)[number]['value']

// Le prix par personne est payé en totalité en ligne. En base, il vit dans
// `events.deposit_amount_cents` (colonne historique, non renommée) avec `deposit_enabled = true`.
export const MIN_EVENT_PRICE_CENTS = 100

// Prix par personne effectif : 0 si le prix est désactivé ou absent. Même règle que le paiement
// (api.reservations.checkout) — à utiliser partout où l'on lit le prix d'une ligne `events`.
export function effectivePriceCents(depositEnabled: boolean, amountCents: number | null): number {
  return depositEnabled ? (amountCents ?? 0) : 0
}

export const eventInputSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(2, 'Titre trop court').max(160),
    eventType: z.enum(['workshop', 'soiree', 'kids', 'collaboration', 'autre']),
    description: z.string().trim().max(2000).optional().default(''),
    startsAt: z.string().min(1, 'Date requise'),
    endsAt: z.string('Indiquez l’heure de fin.').min(1, 'Indiquez l’heure de fin.'),
    capacity: z.number().int().min(1).max(200),
    priceCents: z
      .number('Indiquez le prix par personne.')
      .int()
      .min(MIN_EVENT_PRICE_CENTS, 'Le prix doit être d’au moins 1 €.')
      .max(100000),
    // Privatise la salle : bloque les créneaux d'atelier libre pendant l'événement une fois publié.
    privatise: z.boolean().default(false),
    published: z.boolean(),
  })
  .refine((event) => new Date(event.endsAt).getTime() > new Date(event.startsAt).getTime(), {
    message: 'La fin doit être après le début',
    path: ['endsAt'],
  })

export type EventInput = z.infer<typeof eventInputSchema>

// « Atelier Découverte, l'été ! » → « atelier-decouverte-l-ete »
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function eventTypeLabel(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? 'Événement'
}

// Un événement ne peut être publié (donc réservé) qu'avec une fin et un prix d'au moins 1 €.
export function canPublishEvent(event: { endsAt: string | null; priceCents: number }): boolean {
  return Boolean(event.endsAt) && event.priceCents >= MIN_EVENT_PRICE_CENTS
}

const PRICE_FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const PRICE_CENTS_FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 4500 → « 45 € / pers. », 1250 → « 12,50 € / pers. » (espace insécable avant €).
export function formatPricePerPerson(cents: number): string {
  const euros = cents / 100
  const amount = Number.isInteger(euros) ? PRICE_FMT.format(euros) : PRICE_CENTS_FMT.format(euros)
  return `${amount}\u00a0€ / pers.`
}

// Durée entre deux instants : « 2h », « 1h30 », « 45 min ».
export function formatDuration(startIso: string, endIso: string): string {
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
