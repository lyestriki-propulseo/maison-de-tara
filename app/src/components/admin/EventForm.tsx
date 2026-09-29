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
  depositEnabled: boolean
  depositAmountCents: number
  privatise: boolean
  published: boolean
}

export const EMPTY_EVENT_FORM: EventFormState = {
  title: '',
  eventType: 'workshop',
  description: '',
  startsAt: '',
  endsAt: '',
  capacity: 12,
  depositEnabled: true,
  depositAmountCents: 600,
  privatise: false,
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
          <input className={inputCls} value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Type
          <select className={inputCls} value={form.eventType} onChange={(e) => set({ eventType: e.target.value as EventType })}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Places
          <input type="number" min={1} max={200} className={inputCls} value={form.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Date et heure
          <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Fin {form.privatise ? '' : '(facultatif)'}
          <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600 sm:col-span-2">
          Description
          <textarea className={`${inputCls} min-h-20`} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Acompte (€) à la réservation
          <input
            type="number"
            min={0}
            step={1}
            disabled={!form.depositEnabled}
            className={`${inputCls} disabled:opacity-50`}
            value={Math.round(form.depositAmountCents / 100)}
            onChange={(e) => set({ depositAmountCents: Math.round(Number(e.target.value) * 100) })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={form.depositEnabled} onChange={(e) => set({ depositEnabled: e.target.checked })} />
          Acompte demandé en ligne
        </label>
        <label className="flex items-start gap-2 text-sm text-neutral-700 sm:col-span-2">
          <input type="checkbox" className="mt-1" checked={form.privatise} onChange={(e) => set({ privatise: e.target.checked })} />
          <span>
            Privatiser la salle
            <span className="block text-xs text-neutral-500">
              Une fois publié, les créneaux d’atelier libre pendant l’événement sont bloqués. Ils se
              rouvrent si vous décochez, dépubliez ou supprimez l’événement.
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} />
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
