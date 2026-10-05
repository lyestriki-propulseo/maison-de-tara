import type { ScheduleSlot } from '@/lib/admin-schedule'

// Logique pure de la grille hebdomadaire : regroupement par jour, horaire suivant, copie d'un jour.
export type EditorSlot = ScheduleSlot & { key: string }

export const WEEKDAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
] as const

const DEFAULT_CAPACITY = 25
const DEFAULT_DURATION = 120
const LATEST_START_MINUTES = 23 * 60

export function groupByWeekday(slots: Array<EditorSlot>) {
  return WEEKDAYS.map((day) => ({
    ...day,
    slots: slots
      .filter((slot) => slot.weekday === day.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }))
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Horaire proposé quand on ajoute un créneau à un jour : il enchaîne après le dernier. */
export function nextSlotFor(weekday: number, daySlots: Array<ScheduleSlot>): ScheduleSlot {
  const last = [...daySlots].sort((a, b) => a.startTime.localeCompare(b.startTime)).at(-1)
  if (!last) {
    return {
      weekday,
      startTime: '10:00',
      durationMinutes: DEFAULT_DURATION,
      capacity: DEFAULT_CAPACITY,
    }
  }
  const start = Math.min(toMinutes(last.startTime) + last.durationMinutes, LATEST_START_MINUTES)
  return {
    weekday,
    startTime: toTime(start),
    durationMinutes: last.durationMinutes,
    capacity: last.capacity,
  }
}

/** Remplace les horaires des jours cibles par une copie de ceux du jour source. */
export function copyDay(
  slots: Array<EditorSlot>,
  fromWeekday: number,
  toWeekdays: Array<number>,
  makeKey: () => string,
): Array<EditorSlot> {
  const targets = toWeekdays.filter((weekday) => weekday !== fromWeekday)
  const source = slots.filter((slot) => slot.weekday === fromWeekday)
  const kept = slots.filter((slot) => !targets.includes(slot.weekday))
  const copies = targets.flatMap((weekday) =>
    source.map(({ startTime, durationMinutes, capacity }) => ({
      key: makeKey(),
      weekday,
      startTime,
      durationMinutes,
      capacity,
    })),
  )
  return [...kept, ...copies]
}
