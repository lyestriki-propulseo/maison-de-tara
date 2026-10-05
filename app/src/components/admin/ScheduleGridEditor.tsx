import { useEffect, useState } from 'react'
import type { ScheduleSlot } from '@/lib/admin-schedule'
import { addDaysIso, endOfYearIso, parisToday } from '@/lib/paris-date'
import { copyDay, groupByWeekday, nextSlotFor } from '@/lib/schedule-grid'
import type { EditorSlot } from '@/lib/schedule-grid'
import { ScheduleDayRow } from '@/components/admin/ScheduleDayRow'

// Grille hebdomadaire de l'atelier (modèle des créneaux), éditée dans Réservations › Réglages.
// Une ligne par jour, ses horaires en sous-lignes.
type Template = ScheduleSlot & { id: string }

let keyCounter = 0
const newKey = () => `new-${Date.now()}-${++keyCounter}`

export function ScheduleGridEditor({
  templates,
  pending,
  onSave,
}: {
  templates: Array<Template>
  pending: boolean
  onSave: (slots: Array<ScheduleSlot>, until: string) => Promise<boolean>
}) {
  const today = parisToday()
  const [until, setUntil] = useState(() => endOfYearIso(today))
  const [slots, setSlots] = useState<Array<EditorSlot>>(() =>
    templates.map((template) => ({ ...template, key: template.id })),
  )

  useEffect(() => {
    setSlots(templates.map((template) => ({ ...template, key: template.id })))
  }, [templates])

  function updateSlot(key: string, patch: Partial<ScheduleSlot>) {
    setSlots((current) => current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)))
  }

  return (
    <section className="tara-schedule-editor" aria-labelledby="grid-title">
      <h2 id="grid-title" className="text-lg font-semibold text-[#1A1815]">
        Grille hebdomadaire
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
        Les créneaux sont créés jusqu’à la date choisie. Ceux qui existent déjà gardent leur
        capacité et leur blocage : pour changer la capacité d’un créneau déjà créé, ouvrez-le dans
        le Planning.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
        <div className="hidden gap-5 bg-[#F8F6F1] px-4 py-3 text-xs font-semibold text-neutral-600 md:grid md:grid-cols-[9rem_1fr]">
          <span>Jour</span>
          <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3">
            <span>Début</span>
            <span>Durée (min)</span>
            <span>Places</span>
            <span className="sr-only">Actions</span>
          </div>
        </div>
        <div className="divide-y divide-[#4A5D2E]/12">
          {groupByWeekday(slots).map((day) => (
            <ScheduleDayRow
              key={day.value}
              weekday={day.value}
              label={day.label}
              slots={day.slots}
              onAdd={() =>
                setSlots((current) => [
                  ...current,
                  { ...nextSlotFor(day.value, day.slots), key: newKey() },
                ])
              }
              onUpdate={updateSlot}
              onRemove={(key) => setSlots((current) => current.filter((item) => item.key !== key))}
              onCopy={(toWeekdays) =>
                setSlots((current) => copyDay(current, day.value, toWeekdays, newKey))
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-neutral-500">
          Retirer un horaire le désactive pour les prochaines générations ; les réservations
          existantes restent intactes.
        </p>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-xs font-medium text-neutral-600">
            Générer jusqu’au
            <input
              type="date"
              value={until}
              min={today}
              max={addDaysIso(today, 366)}
              onChange={(event) => setUntil(event.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15"
            />
          </label>
          <button
            type="button"
            disabled={pending || slots.length === 0 || !until}
            onClick={() =>
              onSave(
                slots.map(({ weekday, startTime, durationMinutes, capacity }) => ({
                  weekday,
                  startTime,
                  durationMinutes,
                  capacity,
                })),
                until,
              )
            }
            className="min-h-11 shrink-0 rounded-lg bg-[#4A5D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer et générer'}
          </button>
        </div>
      </div>
    </section>
  )
}
