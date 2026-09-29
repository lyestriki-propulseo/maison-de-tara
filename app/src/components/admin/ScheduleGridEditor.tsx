import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ScheduleSlot } from '@/lib/admin-schedule'

// Grille hebdomadaire de l'atelier (modèle des créneaux), éditée dans Réservations › Réglages.
type Template = ScheduleSlot & { id: string }
type EditorSlot = ScheduleSlot & { key: string }

const WEEKDAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
]

export function ScheduleGridEditor({
  templates,
  pending,
  onSave,
}: {
  templates: Array<Template>
  pending: boolean
  onSave: (slots: Array<ScheduleSlot>) => Promise<boolean>
}) {
  const [slots, setSlots] = useState<Array<EditorSlot>>(() =>
    templates.map((template) => ({ ...template, key: template.id })),
  )

  useEffect(() => {
    setSlots(templates.map((template) => ({ ...template, key: template.id })))
  }, [templates])

  function updateSlot(key: string, patch: Partial<ScheduleSlot>) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
    )
  }

  return (
    <section className="tara-schedule-editor" aria-labelledby="grid-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="grid-title" className="text-lg font-semibold text-[#1A1815]">
            Grille hebdomadaire
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
            Cette grille sert de modèle. À l&apos;enregistrement, les créneaux des 60 prochains
            jours sont créés ; ceux déjà présents gardent leur capacité et leur blocage. Les
            créneaux d&apos;un horaire retiré de la grille disparaissent, sauf s&apos;ils ont des
            réservations.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setSlots((current) => [
              ...current,
              {
                key: `new-${Date.now()}`,
                weekday: 2,
                startTime: '10:00',
                durationMinutes: 120,
                capacity: 12,
              },
            ])
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#4A5D2E] px-3 text-sm font-semibold text-[#4A5D2E] transition-colors hover:bg-[#4A5D2E]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
        >
          <Plus size={16} aria-hidden="true" /> Ajouter un horaire
        </button>
      </div>

      {slots.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#4A5D2E]/25 p-8 text-center">
          <p className="text-sm font-medium text-[#1A1815]">La grille est vide.</p>
          <p className="mt-1 text-sm text-neutral-600">Ajoutez au moins un horaire pour continuer.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_44px] gap-3 bg-[#F8F6F1] px-4 py-3 text-xs font-semibold text-neutral-600 md:grid">
            <span>Jour</span>
            <span>Début</span>
            <span>Durée</span>
            <span>Capacité</span>
            <span className="sr-only">Actions</span>
          </div>
          <div className="divide-y divide-[#4A5D2E]/12">
            {slots.map((slot) => (
              <div
                key={slot.key}
                className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_44px] md:items-end"
              >
                <label className="text-xs font-medium text-neutral-600">
                  <span className="md:sr-only">Jour</span>
                  <select
                    value={slot.weekday}
                    onChange={(event) =>
                      updateSlot(slot.key, { weekday: Number(event.target.value) })
                    }
                    className="mt-1 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15 md:mt-0"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
                <GridInput
                  label="Début"
                  type="time"
                  value={slot.startTime}
                  onChange={(value) => updateSlot(slot.key, { startTime: value })}
                />
                <GridInput
                  label="Durée (min)"
                  type="number"
                  min={30}
                  max={480}
                  step={15}
                  value={slot.durationMinutes}
                  onChange={(value) => updateSlot(slot.key, { durationMinutes: Number(value) })}
                />
                <GridInput
                  label="Capacité"
                  type="number"
                  min={1}
                  max={50}
                  value={slot.capacity}
                  onChange={(value) => updateSlot(slot.key, { capacity: Number(value) })}
                />
                <button
                  type="button"
                  onClick={() => setSlots((current) => current.filter((item) => item.key !== slot.key))}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  aria-label={`Retirer le créneau du ${WEEKDAYS.find((day) => day.value === slot.weekday)?.label ?? 'jour'} à ${slot.startTime}`}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-neutral-500">
          Retirer une ligne désactive cet horaire pour les prochaines générations ; les réservations
          existantes restent intactes.
        </p>
        <button
          type="button"
          disabled={pending || slots.length === 0}
          onClick={() =>
            onSave(
              slots.map(({ weekday, startTime, durationMinutes, capacity }) => ({
                weekday,
                startTime,
                durationMinutes,
                capacity,
              })),
            )
          }
          className="min-h-11 shrink-0 rounded-lg bg-[#4A5D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer et générer'}
        </button>
      </div>
    </section>
  )
}

function GridInput({
  label,
  value,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  label: string
  value: string | number
  onChange: (value: string) => void
}) {
  return (
    <label className="text-xs font-medium text-neutral-600">
      <span className="md:sr-only">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15 md:mt-0"
        aria-label={label}
      />
    </label>
  )
}
