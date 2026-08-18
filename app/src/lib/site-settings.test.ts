import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOURS,
  formatDayHours,
  formatTimeFr,
  hoursSchema,
  parseHours,
} from '@/lib/site-settings'

describe('formatTimeFr', () => {
  it('formate une heure pile sans minutes', () => {
    expect(formatTimeFr('09:00')).toBe('9h')
    expect(formatTimeFr('18:00')).toBe('18h')
  })
  it('garde les minutes non nulles', () => {
    expect(formatTimeFr('09:30')).toBe('9h30')
    expect(formatTimeFr('14:15')).toBe('14h15')
  })
})

describe('formatDayHours', () => {
  it('affiche « Fermé » quand fermé', () => {
    expect(formatDayHours({ closed: true, ranges: [] })).toBe('Fermé')
  })
  it('affiche « Fermé » sans plage même si non fermé', () => {
    expect(formatDayHours({ closed: false, ranges: [] })).toBe('Fermé')
  })
  it('affiche une plage simple', () => {
    expect(formatDayHours({ closed: false, ranges: [{ start: '12:00', end: '18:00' }] })).toBe(
      '12h – 18h',
    )
  })
  it('joint plusieurs plages avec ·', () => {
    expect(
      formatDayHours({
        closed: false,
        ranges: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '18:00' },
        ],
      }),
    ).toBe('9h – 12h · 14h – 18h')
  })
})

describe('hoursSchema', () => {
  it('valide le défaut', () => {
    expect(hoursSchema.safeParse(DEFAULT_HOURS).success).toBe(true)
  })
  it('refuse une heure invalide', () => {
    const bad = { ...DEFAULT_HOURS, tuesday: { closed: false, ranges: [{ start: '25:00', end: '18:00' }] } }
    expect(hoursSchema.safeParse(bad).success).toBe(false)
  })
  it('refuse une plage où la fin précède le début', () => {
    const bad = { ...DEFAULT_HOURS, tuesday: { closed: false, ranges: [{ start: '18:00', end: '12:00' }] } }
    expect(hoursSchema.safeParse(bad).success).toBe(false)
  })
  it('refuse un jour manquant', () => {
    const { sunday, ...partial } = DEFAULT_HOURS
    void sunday
    expect(hoursSchema.safeParse(partial).success).toBe(false)
  })
})

describe('parseHours', () => {
  it('renvoie la valeur validée si correcte', () => {
    expect(parseHours(DEFAULT_HOURS)).toEqual(DEFAULT_HOURS)
  })
  it('retombe sur le défaut si invalide', () => {
    expect(parseHours({ nope: true })).toEqual(DEFAULT_HOURS)
    expect(parseHours(null)).toEqual(DEFAULT_HOURS)
  })
})
