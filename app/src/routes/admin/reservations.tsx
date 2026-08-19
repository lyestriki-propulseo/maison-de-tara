import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { listReservations, listReservationTargets, updateReservationStatus } from '@/lib/reservations-data'
import { createManualReservation } from '@/lib/admin-data'
import {
  RESERVATION_DATE_FMT,
  RESERVATION_SOURCE_LABEL,
  RESERVATION_STATUSES,
  reservationStatusLabel
  
} from '@/lib/reservations'
import type {ReservationStatus} from '@/lib/reservations';
import { ReservationForm  } from '@/components/admin/ReservationForm'
import type {ManualReservationInput} from '@/components/admin/ReservationForm';

export const Route = createFileRoute('/admin/reservations')({
  loader: async () => {
    const [reservations, targets] = await Promise.all([listReservations(), listReservationTargets()])
    return { reservations, targets }
  },
  component: ReservationsPage,
})

type ReservationRow = Awaited<ReturnType<typeof listReservations>>[number]

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue'
}

function ReservationsPage() {
  const router = useRouter()
  const { reservations, targets } = Route.useLoaderData()
  const [filter, setFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string }>()

  async function runAction(action: () => Promise<unknown>, success: string) {
    setPending(true)
    setFeedback(undefined)
    try {
      await action()
      await router.invalidate()
      setFeedback({ kind: 'success', message: success })
      return true
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
      return false
    } finally {
      setPending(false)
    }
  }

  async function saveManual(input: ManualReservationInput) {
    const ok = await runAction(() => createManualReservation({ data: input }), 'Réservation ajoutée.')
    if (ok) setFormOpen(false)
  }

  function changeStatus(reservation: ReservationRow, status: ReservationStatus) {
    void runAction(
      () => updateReservationStatus({ data: { id: reservation.id, status } }),
      'Statut mis à jour.',
    )
  }

  const visible = filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)

  return (
    <div className="tara-admin-page">
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Le suivi</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">Réservations</h1>
          <p className="tara-page-intro">
            Toutes les personnes ayant réservé un atelier libre ou un événement du programme.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormOpen(true)
            setFeedback(undefined)
          }}
          className="tara-primary-action inline-flex items-center gap-2"
        >
          <Plus size={16} aria-hidden="true" /> Nouvelle réservation
        </button>
      </div>

      {feedback ? <Feedback kind={feedback.kind}>{feedback.message}</Feedback> : null}

      {formOpen ? (
        <ReservationForm targets={targets} pending={pending} onSave={saveManual} onCancel={() => setFormOpen(false)} />
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
          Toutes ({reservations.length})
        </FilterTab>
        {RESERVATION_STATUSES.map((s) => (
          <FilterTab key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)}>
            {s.label} ({reservations.filter((r) => r.status === s.value).length})
          </FilterTab>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-600">Aucune réservation pour ce filtre.</p>
        ) : (
          <ul className="divide-y divide-[#4A5D2E]/12">
            {visible.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E4ECD8] px-2.5 py-0.5 text-xs font-semibold text-[#31421E]">
                      {r.target.kind === 'event' ? 'Événement' : r.target.kind === 'atelier' ? 'Atelier' : '—'}
                    </span>
                    <span className="text-xs font-medium text-neutral-400">{RESERVATION_SOURCE_LABEL[r.source] ?? r.source}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-[#1A1815]">
                    {r.customerName} · {r.partySize} pers.
                  </p>
                  <p className="text-xs capitalize text-neutral-500">
                    {r.target.label} {r.target.at ? `· ${RESERVATION_DATE_FMT.format(new Date(r.target.at))}` : ''}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {r.customerEmail}
                    {r.customerPhone ? ` · ${r.customerPhone}` : ''}
                  </p>
                </div>
                <select
                  value={r.status}
                  disabled={pending}
                  onChange={(e) => changeStatus(r, e.target.value as ReservationStatus)}
                  className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E]"
                >
                  {RESERVATION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {reservationStatusLabel(s.value)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
        active ? 'bg-[#4A5D2E] text-white' : 'bg-[#4A5D2E]/8 text-[#31421E] hover:bg-[#4A5D2E]/15'
      }`}
    >
      {children}
    </button>
  )
}

function Feedback({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`mt-5 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
        kind === 'success' ? 'bg-[#E9F0DF] text-[#31421E]' : 'bg-red-50 text-red-800'
      }`}
    >
      <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
