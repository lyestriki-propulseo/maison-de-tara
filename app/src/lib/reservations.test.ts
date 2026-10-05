import { describe, expect, it } from 'vitest'
import { isUpcoming } from '@/lib/reservations'

describe('isUpcoming', () => {
  it('classe aujourd’hui dans « à venir »', () => expect(isUpcoming('2026-10-05', '2026-10-05')).toBe(true))
  it('classe demain dans « à venir »', () => expect(isUpcoming('2026-10-06', '2026-10-05')).toBe(true))
  it('classe hier dans « passées »', () => expect(isUpcoming('2026-10-04', '2026-10-05')).toBe(false))
  it('classe une cible supprimée dans « passées »', () => expect(isUpcoming(null, '2026-10-05')).toBe(false))
})
