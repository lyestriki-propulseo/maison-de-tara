import { z } from 'zod'

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide')

export const sessionActionSchema = z.object({
  sessionId: z.uuid(),
  scope: z.enum(['slot', 'day']).default('slot'),
  blocked: z.boolean(),
  note: z.string().trim().max(300).optional(),
})

export const capacitySchema = z.object({
  sessionId: z.uuid(),
  capacity: z.number().int().min(1).max(50),
})

export const manualReservationSchema = z.object({
  sessionId: z.uuid(),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().email().max(200),
  customerPhone: z.string().trim().max(30).optional(),
  partySize: z.number().int().min(1).max(50),
  notes: z.string().trim().max(500).optional(),
})

export const scheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: timeSchema,
  durationMinutes: z.number().int().min(30).max(480),
  capacity: z.number().int().min(1).max(50),
})

export const scheduleGridSchema = z
  .object({
    slots: z.array(scheduleSlotSchema).min(1).max(60),
  })
  .superRefine(({ slots }, context) => {
    const seen = new Set<string>()
    for (const [index, slot] of slots.entries()) {
      const key = `${slot.weekday}-${slot.startTime}`
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          message: 'Deux créneaux ne peuvent pas commencer à la même heure le même jour',
          path: ['slots', index, 'startTime'],
        })
      }
      seen.add(key)
    }
  })

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>

type PersistedTemplate = ScheduleSlot & { id: string }

export function buildFutureSessionInstances(
  templates: Array<PersistedTemplate>,
  startDate: string,
  numberOfDays: number,
) {
  const start = new Date(`${startDate}T12:00:00Z`)
  const rows: Array<{
    session_date: string
    start_time: string
    duration_minutes: number
    capacity: number
    template_id: string
  }> = []

  for (let offset = 0; offset < numberOfDays; offset += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + offset)
    const dateString = date.toISOString().slice(0, 10)

    for (const template of templates) {
      if (template.weekday !== date.getUTCDay()) continue
      rows.push({
        session_date: dateString,
        start_time: `${template.startTime}:00`,
        duration_minutes: template.durationMinutes,
        capacity: template.capacity,
        template_id: template.id,
      })
    }
  }

  return rows.sort((a, b) =>
    `${a.session_date}-${a.start_time}`.localeCompare(`${b.session_date}-${b.start_time}`),
  )
}
