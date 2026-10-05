import { describe, expect, it } from 'vitest'
import { addDaysIso, daysBetweenInclusive, endOfYearIso, parisToday } from '@/lib/paris-date'

describe('parisToday', () => {
  it('renvoie la date de Paris, pas la date UTC, apres minuit', () => {
    // 4 oct. 23:30 UTC = 5 oct. 01:30 a Paris (UTC+2)
    expect(parisToday(new Date('2026-10-04T23:30:00Z'))).toBe('2026-10-05')
  })
  it('gere l\'heure d\'hiver', () => {
    expect(parisToday(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
  })
})

describe('calculs de dates ISO', () => {
  it('ajoute des jours en traversant un mois', () => {
    expect(addDaysIso('2026-09-28', 7)).toBe('2026-10-05')
  })
  it('donne le 31 decembre de l\'annee', () => {
    expect(endOfYearIso('2026-10-05')).toBe('2026-12-31')
  })
  it('compte les jours bornes incluses', () => {
    expect(daysBetweenInclusive('2026-10-05', '2026-10-05')).toBe(1)
    expect(daysBetweenInclusive('2026-10-05', '2026-12-31')).toBe(88)
  })
})
