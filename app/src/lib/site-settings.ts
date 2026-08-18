import { z } from 'zod'

// Horaires d'ouverture de la maison — source de vérité unique (table site_settings, clé 'hours').
// Éditée par Tara dans l'admin, lue par le site vitrine (RLS : anon peut lire la clé 'hours').

export const WEEKDAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
] as const

export type WeekdayKey = (typeof WEEKDAYS)[number]['key']

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (format HH:MM)')

export const hoursRangeSchema = z
  .object({ start: timeSchema, end: timeSchema })
  .refine((r) => r.start < r.end, { message: 'La fin doit être après le début' })

export const dayHoursSchema = z.object({
  closed: z.boolean(),
  ranges: z.array(hoursRangeSchema).max(4),
})

export const hoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
})

export type HoursRange = z.infer<typeof hoursRangeSchema>
export type DayHours = z.infer<typeof dayHoursSchema>
export type Hours = z.infer<typeof hoursSchema>

// Valeur par défaut = horaires actuellement affichés sur le site (repris de contact.html
// « Ouverture de la maison »). Sert de graine et de repli si la base est vide.
export const DEFAULT_HOURS: Hours = {
  monday: { closed: true, ranges: [] },
  tuesday: { closed: false, ranges: [{ start: '12:00', end: '18:00' }] },
  wednesday: { closed: false, ranges: [{ start: '09:00', end: '18:00' }] },
  thursday: { closed: false, ranges: [{ start: '09:00', end: '21:00' }] },
  friday: { closed: false, ranges: [{ start: '09:00', end: '21:00' }] },
  saturday: { closed: false, ranges: [{ start: '09:00', end: '21:00' }] },
  sunday: { closed: false, ranges: [{ start: '09:00', end: '15:00' }] },
}

// Parse tolérant : renvoie les horaires validés, ou le défaut si la valeur stockée est invalide.
export function parseHours(value: unknown): Hours {
  const result = hoursSchema.safeParse(value)
  return result.success ? result.data : DEFAULT_HOURS
}

// « 09:00 » → « 9h », « 09:30 » → « 9h30 » (format d'affichage FR compact du site).
export function formatTimeFr(time: string): string {
  const [h, m] = time.split(':')
  const hour = String(Number(h))
  return m === '00' ? `${hour}h` : `${hour}h${m}`
}

// Une journée → texte affichable. Ex : « 9h – 18h » (une plage), « 12h – 18h · 19h – 21h »
// (plusieurs plages), « Fermé » (fermé ou sans plage).
export function formatDayHours(day: DayHours): string {
  if (day.closed || day.ranges.length === 0) return 'Fermé'
  return day.ranges
    .map((r) => `${formatTimeFr(r.start)} – ${formatTimeFr(r.end)}`)
    .join(' · ')
}
