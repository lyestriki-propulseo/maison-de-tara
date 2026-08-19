import { useState } from 'react'

export type ReservationTargets = {
  sessions: Array<{ id: string; label: string }>
  events: Array<{ id: string; label: string }>
}

export type ManualReservationInput = {
  sessionId?: string
  eventId?: string
  customerName: string
  customerEmail: string
  customerPhone: string
  partySize: number
  notes: string
}

const EMPTY: ManualReservationInput = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  partySize: 1,
  notes: '',
}

// Formulaire de réservation manuelle (prise par téléphone / en personne) — cible un créneau
// d'atelier libre OU un événement du programme. La capacité est vérifiée côté base (trigger).
export function ReservationForm({
  targets,
  pending,
  onSave,
  onCancel,
}: {
  targets: ReservationTargets
  pending: boolean
  onSave: (input: ManualReservationInput) => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<'atelier' | 'event'>('atelier')
  const [targetId, setTargetId] = useState('')
  const [form, setForm] = useState(EMPTY)
  const set = (patch: Partial<ManualReservationInput>) => setForm({ ...form, ...patch })
  const inputCls =
    'mt-1 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15'

  const options = kind === 'atelier' ? targets.sessions : targets.events

  return (
    <section className="mt-6 rounded-xl border border-[#4A5D2E]/20 bg-[#F8F6F1] p-5">
      <h2 className="text-lg font-semibold text-[#1A1815]">Nouvelle réservation manuelle</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-neutral-600">
          Type de créneau
          <select
            className={inputCls}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as 'atelier' | 'event')
              setTargetId('')
            }}
          >
            <option value="atelier">Atelier libre</option>
            <option value="event">Événement du programme</option>
          </select>
        </label>
        <label className="text-xs font-medium text-neutral-600">
          {kind === 'atelier' ? 'Créneau' : 'Événement'}
          <select className={inputCls} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">— Choisir —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Nom du client
          <input className={inputCls} value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Nombre de personnes
          <input
            type="number"
            min={1}
            max={50}
            className={inputCls}
            value={form.partySize}
            onChange={(e) => set({ partySize: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          E-mail
          <input type="email" className={inputCls} value={form.customerEmail} onChange={(e) => set({ customerEmail: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Téléphone
          <input className={inputCls} value={form.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600 sm:col-span-2">
          Notes
          <textarea className={`${inputCls} min-h-16`} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
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
          disabled={pending || !targetId}
          onClick={() =>
            onSave({
              [kind === 'atelier' ? 'sessionId' : 'eventId']: targetId,
              customerName: form.customerName,
              customerEmail: form.customerEmail,
              customerPhone: form.customerPhone,
              partySize: form.partySize,
              notes: form.notes,
            })
          }
          className="min-h-10 rounded-lg bg-[#4A5D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </section>
  )
}
