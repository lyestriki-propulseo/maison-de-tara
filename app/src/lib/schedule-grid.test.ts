import { describe, expect, it } from 'vitest'
import { copyDay, groupByWeekday, nextSlotFor } from '@/lib/schedule-grid'

const slot = (key: string, weekday: number, startTime: string, capacity = 25) => ({
  key,
  weekday,
  startTime,
  durationMinutes: 120,
  capacity,
})

describe('groupByWeekday', () => {
  it('donne les 7 jours du lundi au dimanche, horaires triés par heure', () => {
    const days = groupByWeekday([
      slot('a', 3, '16:00'),
      slot('b', 3, '10:00'),
      slot('c', 0, '10:00'),
    ])
    expect(days.map((day) => day.label)).toEqual([
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
      'Dimanche',
    ])
    expect(days[0]?.slots).toEqual([])
    expect(days[2]?.slots.map((s) => s.startTime)).toEqual(['10:00', '16:00'])
    expect(days[6]?.slots.map((s) => s.key)).toEqual(['c'])
  })
})

describe('nextSlotFor', () => {
  it('propose 10:00, 2 h, 25 places sur un jour vide', () => {
    expect(nextSlotFor(2, [])).toEqual({
      weekday: 2,
      startTime: '10:00',
      durationMinutes: 120,
      capacity: 25,
    })
  })
  it('enchaîne après le dernier horaire du jour en reprenant sa capacité', () => {
    expect(nextSlotFor(3, [slot('a', 3, '10:00', 20), slot('b', 3, '13:00', 18)])).toEqual({
      weekday: 3,
      startTime: '15:00',
      durationMinutes: 120,
      capacity: 18,
    })
  })
  it('ne dépasse pas 23:00', () => {
    expect(nextSlotFor(3, [slot('a', 3, '22:30')]).startTime).toBe('23:00')
  })
})

describe('copyDay', () => {
  it('remplace les horaires des jours cibles par ceux du jour source', () => {
    let n = 0
    const result = copyDay(
      [slot('a', 3, '10:00'), slot('b', 3, '13:00'), slot('c', 4, '18:00'), slot('d', 0, '10:00')],
      3,
      [4, 5],
      () => `k${++n}`,
    )
    const of = (weekday: number) =>
      result
        .filter((s) => s.weekday === weekday)
        .map((s) => s.startTime)
        .sort()
    expect(of(3)).toEqual(['10:00', '13:00'])
    expect(of(4)).toEqual(['10:00', '13:00'])
    expect(of(5)).toEqual(['10:00', '13:00'])
    expect(of(0)).toEqual(['10:00'])
    expect(new Set(result.map((s) => s.key)).size).toBe(result.length)
  })
  it('vide les jours cibles quand le jour source est fermé', () => {
    const result = copyDay([slot('c', 4, '18:00')], 1, [4], () => 'x')
    expect(result).toEqual([])
  })
})
