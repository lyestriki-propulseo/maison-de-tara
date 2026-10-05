import { describe, expect, it } from 'vitest'
import { effectivePriceCents, eventInputSchema, eventTypeLabel, formatDuration, formatPricePerPerson, slugify } from '@/lib/events'

describe('slugify', () => {
  it('retire les accents et met en kebab-case', () => {
    expect(slugify('Atelier Découverte')).toBe('atelier-decouverte')
    expect(slugify("Soirée d'été !")).toBe('soiree-d-ete')
  })
  it('nettoie les tirets en trop', () => {
    expect(slugify('  --Noël--  ')).toBe('noel')
  })
})

describe('eventTypeLabel', () => {
  it('traduit le type', () => {
    expect(eventTypeLabel('workshop')).toBe('Atelier')
    expect(eventTypeLabel('soiree')).toBe('Soirée')
    expect(eventTypeLabel('inconnu')).toBe('Événement')
  })
})

describe('eventInputSchema', () => {
  const base = {
    title: 'Atelier découverte',
    eventType: 'workshop' as const,
    startsAt: '2026-10-03T14:00',
    endsAt: '2026-10-03T16:00',
    capacity: 12,
    priceCents: 4500,
    published: true,
  }
  it('valide un événement correct', () => {
    expect(eventInputSchema.safeParse(base).success).toBe(true)
  })
  it('applique les valeurs par défaut', () => {
    const parsed = eventInputSchema.parse(base)
    expect(parsed.description).toBe('')
  })
  it('refuse un titre trop court', () => {
    expect(eventInputSchema.safeParse({ ...base, title: 'A' }).success).toBe(false)
  })
  it('refuse une capacité nulle', () => {
    expect(eventInputSchema.safeParse({ ...base, capacity: 0 }).success).toBe(false)
  })
  it('ne privatise pas par défaut', () => {
    expect(eventInputSchema.parse(base).privatise).toBe(false)
  })
  it('exige un prix d’au moins 1 €', () => {
    expect(eventInputSchema.safeParse({ ...base, priceCents: 50 }).success).toBe(false)
    expect(eventInputSchema.safeParse({ ...base, priceCents: undefined }).success).toBe(false)
  })
  it('exige une heure de fin après le début', () => {
    const result = eventInputSchema.safeParse({ ...base, endsAt: null })
    expect(result.success).toBe(false)
    expect(eventInputSchema.safeParse({ ...base, endsAt: '' }).error?.issues[0]?.message).toBe(
      'Indiquez l’heure de fin.',
    )
  })
  it('accepte 12,50 €', () => {
    expect(eventInputSchema.safeParse({ ...base, priceCents: 1250 }).success).toBe(true)
  })
  it('refuse une fin avant le début', () => {
    const result = eventInputSchema.safeParse({
      ...base,
      privatise: true,
      endsAt: '2026-10-03T13:00',
    })
    expect(result.success).toBe(false)
  })
  it('accepte une privatisation avec une fin après le début', () => {
    const result = eventInputSchema.safeParse({
      ...base,
      privatise: true,
      endsAt: '2026-10-03T17:00',
    })
    expect(result.success).toBe(true)
  })
})

describe('formatPricePerPerson', () => {
  it('affiche le prix par personne en euros', () => {
    expect(formatPricePerPerson(4500)).toBe('45\u00a0€ / pers.')
    expect(formatPricePerPerson(1250)).toBe('12,50\u00a0€ / pers.')
  })
})

describe('formatDuration', () => {
  it('affiche la durée en heures et minutes', () => {
    expect(formatDuration('2026-10-03T14:00:00Z', '2026-10-03T16:00:00Z')).toBe('2h')
    expect(formatDuration('2026-10-03T14:00:00Z', '2026-10-03T15:30:00Z')).toBe('1h30')
    expect(formatDuration('2026-10-03T14:00:00Z', '2026-10-03T14:45:00Z')).toBe('45 min')
  })
})

describe('effectivePriceCents', () => {
  it('renvoie le prix quand il est actif', () => {
    expect(effectivePriceCents(true, 4500)).toBe(4500)
  })
  it('renvoie 0 quand le prix est désactivé ou absent', () => {
    expect(effectivePriceCents(false, 4500)).toBe(0)
    expect(effectivePriceCents(true, null)).toBe(0)
    expect(effectivePriceCents(false, null)).toBe(0)
  })
})
