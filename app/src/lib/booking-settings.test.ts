import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ATELIER_DEPOSIT_CENTS,
  atelierDepositSchema,
  parseAtelierDepositCents,
} from '@/lib/booking-settings'

describe('parseAtelierDepositCents', () => {
  it('lit le montant enregistré', () => {
    expect(parseAtelierDepositCents({ cents: 800 })).toBe(800)
  })
  it('accepte 0 € (réservation sans acompte)', () => {
    expect(parseAtelierDepositCents({ cents: 0 })).toBe(0)
  })
  it('retombe sur 6 € si rien n’est enregistré ou si la valeur est invalide', () => {
    expect(DEFAULT_ATELIER_DEPOSIT_CENTS).toBe(600)
    expect(parseAtelierDepositCents(null)).toBe(600)
    expect(parseAtelierDepositCents({ cents: -5 })).toBe(600)
    expect(parseAtelierDepositCents('600')).toBe(600)
  })
})

describe('atelierDepositSchema', () => {
  it('refuse un montant négatif ou décimal', () => {
    expect(atelierDepositSchema.safeParse({ cents: -1 }).success).toBe(false)
    expect(atelierDepositSchema.safeParse({ cents: 6.5 }).success).toBe(false)
  })
  it('plafonne à 100 € par personne', () => {
    expect(atelierDepositSchema.safeParse({ cents: 10000 }).success).toBe(true)
    expect(atelierDepositSchema.safeParse({ cents: 10001 }).success).toBe(false)
  })
})
