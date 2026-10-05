import { useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import type { ScheduleSlot } from '@/lib/admin-schedule'
import { WEEKDAYS } from '@/lib/schedule-grid'
import type { EditorSlot } from '@/lib/schedule-grid'

// Une ligne de la grille hebdomadaire : un jour, ses horaires en sous-lignes, ajout et copie.
const INPUT_CLASS =
  'mt-1 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15 md:mt-0'
const GHOST_BUTTON_CLASS =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-[#4A5D2E] transition-colors hover:bg-[#4A5D2E]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-40'

export function ScheduleDayRow({
  weekday,
  label,
  slots,
  onAdd,
  onUpdate,
  onRemove,
  onCopy,
}: {
  weekday: number
  label: string
  slots: Array<EditorSlot>
  onAdd: () => void
  onUpdate: (key: string, patch: Partial<ScheduleSlot>) => void
  onRemove: (key: string) => void
  onCopy: (toWeekdays: Array<number>) => void
}) {
  const [copyOpen, setCopyOpen] = useState(false)
  const [targets, setTargets] = useState<Array<number>>([])
  const lower = label.toLowerCase()
  const otherDays = WEEKDAYS.filter((day) => day.value !== weekday)

  function toggleTarget(value: number) {
    setTargets((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  function confirmCopy() {
    onCopy(targets)
    setTargets([])
    setCopyOpen(false)
  }

  return (
    <fieldset className="grid gap-3 px-4 py-4 md:grid-cols-[9rem_1fr] md:gap-5">
      <legend className="sr-only">{label}</legend>
      <p aria-hidden="true" className="pt-2 text-sm font-semibold text-[#1A1815]">
        {label}
      </p>

      <div className="grid gap-2">
        {slots.length === 0 ? (
          <p className="pt-2 text-sm text-neutral-500">Fermé</p>
        ) : (
          slots.map((slot, index) => (
            <div
              key={slot.key}
              className="grid grid-cols-[1fr_1fr_1fr_44px] items-end gap-2 md:gap-3"
            >
              <SlotInput
                showLabel={index === 0}
                label="Début"
                type="time"
                value={slot.startTime}
                onChange={(value) => onUpdate(slot.key, { startTime: value })}
              />
              <SlotInput
                showLabel={index === 0}
                label="Durée (min)"
                type="number"
                min={30}
                max={480}
                step={15}
                value={slot.durationMinutes}
                onChange={(value) => onUpdate(slot.key, { durationMinutes: Number(value) })}
              />
              <SlotInput
                showLabel={index === 0}
                label="Places"
                type="number"
                min={1}
                max={50}
                value={slot.capacity}
                onChange={(value) => onUpdate(slot.key, { capacity: Number(value) })}
              />
              <button
                type="button"
                onClick={() => onRemove(slot.key)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                aria-label={`Retirer le créneau du ${lower} à ${slot.startTime}`}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))
        )}

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={onAdd}
            className={GHOST_BUTTON_CLASS}
            aria-label={`Ajouter un horaire le ${lower}`}
          >
            <Plus size={15} aria-hidden="true" /> Ajouter un horaire
          </button>
          <button
            type="button"
            onClick={() => setCopyOpen((open) => !open)}
            disabled={slots.length === 0}
            aria-expanded={copyOpen}
            className={GHOST_BUTTON_CLASS}
            aria-label={`Copier les horaires du ${lower}`}
          >
            <Copy size={15} aria-hidden="true" /> Copier vers…
          </button>
        </div>

        {copyOpen ? (
          <div className="rounded-lg border border-[#4A5D2E]/20 bg-[#F8F6F1] p-3">
            <p className="text-xs text-neutral-600">
              Les horaires du {lower} remplaceront ceux des jours cochés.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {otherDays.map((day) => (
                <label
                  key={day.value}
                  className="inline-flex items-center gap-1.5 text-sm text-[#1A1815]"
                >
                  <input
                    type="checkbox"
                    checked={targets.includes(day.value)}
                    onChange={() => toggleTarget(day.value)}
                    className="size-4 accent-[#4A5D2E]"
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={confirmCopy}
                disabled={targets.length === 0}
                className="min-h-9 rounded-lg bg-[#4A5D2E] px-3 text-sm font-semibold text-white hover:bg-[#3B4B24] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copier vers {targets.length} jour{targets.length > 1 ? 's' : ''}
              </button>
              <button
                type="button"
                onClick={() => setCopyOpen(false)}
                className={GHOST_BUTTON_CLASS}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </fieldset>
  )
}

function SlotInput({
  label,
  showLabel,
  value,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  label: string
  showLabel: boolean
  value: string | number
  onChange: (value: string) => void
}) {
  return (
    <label className="text-xs font-medium text-neutral-600">
      <span className={showLabel ? 'md:sr-only' : 'sr-only'}>{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
        aria-label={label}
      />
    </label>
  )
}
