import { describe, expect, it } from 'vitest'
import { blockedSlotLabel } from '@/lib/agenda-labels'

// US-004 CA-06 — un créneau bloqué par une privatisation dit pourquoi dans l'agenda.
describe('blockedSlotLabel', () => {
  it('CA-06 — affiche « Privatisé : <titre> » pour un créneau bloqué par un événement', () => {
    expect(blockedSlotLabel('Privatisé : Syn’After')).toBe('Privatisé : Syn’After')
  })
  it('CA-06 — garde « Bloqué » pour un blocage manuel, avec ou sans note interne', () => {
    expect(blockedSlotLabel(null)).toBe('Bloqué')
    expect(blockedSlotLabel('Fermé pour inventaire')).toBe('Bloqué')
  })
})
