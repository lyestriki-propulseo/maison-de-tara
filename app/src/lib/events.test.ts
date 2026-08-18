import { describe, expect, it } from 'vitest'
import { eventInputSchema, eventTypeLabel, slugify } from '@/lib/events'

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
    capacity: 12,
    depositEnabled: true,
    depositAmountCents: 600,
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
})
