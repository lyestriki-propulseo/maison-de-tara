import { describe, expect, test } from 'vitest'
import {
  buildFutureSessionInstances,
  manualReservationSchema,
  scheduleGridSchema,
} from '@/lib/admin-schedule'

describe('manualReservationSchema', () => {
  test('accepte une réservation manuelle complète', () => {
    const result = manualReservationSchema.safeParse({
      sessionId: '59f7069f-82e7-44df-a907-c2d22bc6062f',
      customerName: 'Camille Martin',
      customerEmail: 'camille@example.com',
      customerPhone: '06 12 34 56 78',
      partySize: 3,
      notes: 'Appel téléphonique',
    })

    expect(result.success).toBe(true)
  })

  test('refuse une quantité nulle et un email invalide', () => {
    const result = manualReservationSchema.safeParse({
      sessionId: '59f7069f-82e7-44df-a907-c2d22bc6062f',
      customerName: 'Camille Martin',
      customerEmail: 'pas-un-email',
      partySize: 0,
    })

    expect(result.success).toBe(false)
  })
})

describe('scheduleGridSchema', () => {
  test('refuse deux créneaux identiques le même jour', () => {
    const result = scheduleGridSchema.safeParse({
      slots: [
        { weekday: 2, startTime: '10:00', durationMinutes: 120, capacity: 12 },
        { weekday: 2, startTime: '10:00', durationMinutes: 90, capacity: 8 },
      ],
    })

    expect(result.success).toBe(false)
  })
})

describe('buildFutureSessionInstances', () => {
  test('génère seulement les dates correspondant à la grille', () => {
    const rows = buildFutureSessionInstances(
      [
        {
          id: 'template-mardi',
          weekday: 2,
          startTime: '10:00',
          durationMinutes: 120,
          capacity: 12,
        },
        {
          id: 'template-samedi',
          weekday: 6,
          startTime: '14:00',
          durationMinutes: 90,
          capacity: 16,
        },
      ],
      '2026-07-13',
      7,
    )

    expect(rows).toEqual([
      {
        session_date: '2026-07-14',
        start_time: '10:00:00',
        duration_minutes: 120,
        capacity: 12,
        template_id: 'template-mardi',
      },
      {
        session_date: '2026-07-18',
        start_time: '14:00:00',
        duration_minutes: 90,
        capacity: 16,
        template_id: 'template-samedi',
      },
    ])
  })
})
