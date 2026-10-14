import { EVENT_TYPES } from '@/lib/events'
import type { EventType } from '@/lib/events'

export type EventFormState = {
  id?: string
  title: string
  eventType: EventType
  description: string
  startsAt: string
  endsAt: string
  capacity: number
  // Saisie brute en euros (« 45 », « 12.5 ») : convertie en centimes à l'enregistrement.
  priceEuros: string
  privatise: boolean
  // Événement privé (US-004) : sans prix ni places, salle toujours privatisée.
  isPrivate: boolean
  // Réservations en cours : avertit avant de passer l'événement en privé (lecture seule).
  reservationCount: number
  published: boolean
}

export const EMPTY_EVENT_FORM: EventFormState = {
  title: '',
  eventType: 'workshop',
  description: '',
  startsAt: '',
  endsAt: '',
  capacity: 12,
  priceEuros: '',
  privatise: false,
  isPrivate: false,
  reservationCount: 0,
  published: false,
}

const inputCls =
  'mt-1 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15'

export function EventForm({
  form,
  pending,
  onChange,
  onSave,
  onCancel,
}: {
  form: EventFormState
  pending: boolean
  onChange: (next: EventFormState) => void
  onSave: () => void
  onCancel: () => void
}) {
  const set = (patch: Partial<EventFormState>) => onChange({ ...form, ...patch })

  return (
    <section className="mt-6 rounded-xl border border-[#4A5D2E]/20 bg-[#F8F6F1] p-5">
      <h2 className="text-lg font-semibold text-[#1A1815]">
        {form.id ? 'Modifier l’événement' : 'Nouvel événement'}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-neutral-600 sm:col-span-2">
          Titre
          <input
            className={inputCls}
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </label>
        <PrivateToggle
          form={form}
          // Repasser en public : la salle n'est plus privatisée d'office (Tara peut recocher).
          onToggle={(isPrivate) => set(isPrivate ? { isPrivate } : { isPrivate, privatise: false })}
        />
        <label className="text-xs font-medium text-neutral-600">
          Type
          <select
            className={inputCls}
            value={form.eventType}
            onChange={(e) => set({ eventType: e.target.value as EventType })}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`text-xs font-medium text-neutral-600 ${form.isPrivate ? 'hidden' : ''}`}>
          Places
          <input
            type="number"
            min={1}
            max={200}
            className={inputCls}
            value={form.capacity}
            onChange={(e) => set({ capacity: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Date et heure
          <input
            type="datetime-local"
            className={inputCls}
            value={form.startsAt}
            onChange={(e) => set({ startsAt: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Fin
          <input
            type="datetime-local"
            className={inputCls}
            value={form.endsAt}
            onChange={(e) => set({ endsAt: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-neutral-600 sm:col-span-2">
          Description
          <textarea
            className={`${inputCls} min-h-20`}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </label>
        <label
          className={`text-xs font-medium text-neutral-600 sm:col-span-2 ${form.isPrivate ? 'hidden' : ''}`}
        >
          Prix par personne (€)
          <input
            type="number"
            min="1"
            step="0.5"
            inputMode="decimal"
            className={`${inputCls} sm:max-w-48`}
            value={form.priceEuros}
            onChange={(e) => set({ priceEuros: e.target.value })}
          />
          <span className="mt-1 block font-normal text-neutral-500">
            Payé en totalité en ligne au moment de la réservation.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-neutral-700 sm:col-span-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.isPrivate || form.privatise}
            disabled={form.isPrivate}
            onChange={(e) => set({ privatise: e.target.checked })}
          />
          <span>
            Privatiser la salle
            <span className="block text-xs text-neutral-500">
              {form.isPrivate
                ? 'Toujours privatisée pour un événement privé.'
                : 'Une fois publié, les créneaux d’atelier libre pendant l’événement sont bloqués. Ils se rouvrent si vous décochez, dépubliez ou supprimez l’événement.'}
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set({ published: e.target.checked })}
          />
          Publié sur le site
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="min-h-10 rounded-lg bg-[#4A5D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </section>
  )
}

function PrivateToggle({
  form,
  onToggle,
}: {
  form: EventFormState
  onToggle: (isPrivate: boolean) => void
}) {
  return (
    <div className="sm:col-span-2">
      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.isPrivate}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>
          Événement privé (sur invitation)
          <span className="block text-xs text-neutral-500">
            Sans prix ni réservation en ligne. Une fois publié, la salle est privatisée et le site
            affiche seulement « Événement privé » à cette date.
          </span>
        </span>
      </label>
      {form.isPrivate && form.reservationCount > 0 ? (
        <p role="alert" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Cet événement a déjà {form.reservationCount} réservation(s) : pensez à prévenir et
          rembourser ces clients.
        </p>
      ) : null}
    </div>
  )
}

// « 45 » → 4500 ; champ vide → undefined (le schéma demande alors le prix).
export function priceEurosToCents(priceEuros: string): number | undefined {
  return priceEuros.trim() === '' ? undefined : Math.round(Number(priceEuros) * 100)
}
