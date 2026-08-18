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

export const eventInputSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(2, 'Titre trop court').max(160),
  eventType: z.enum(['workshop', 'soiree', 'kids', 'collaboration', 'autre']),
  description: z.string().trim().max(2000).optional().default(''),
  startsAt: z.string().min(1, 'Date requise'),
  capacity: z.number().int().min(1).max(200),
  depositEnabled: z.boolean(),
  depositAmountCents: z.number().int().min(0).max(100000).nullable().default(null),
  published: z.boolean(),
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
