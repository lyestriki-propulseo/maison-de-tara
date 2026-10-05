import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ReservationsTabs } from '@/components/admin/ReservationsTabs'
import { WeekCalendar, startOfWeek } from '@/components/admin/AgendaWeekCalendar'
import { addDaysIso, parisToday } from '@/lib/paris-date'
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Unlock,
  Users,
} from 'lucide-react'
import type { getAgendaData } from '@/lib/admin-data'
import {
  createManualReservation,
  setSessionBlocked,
  updateSessionCapacity,
} from '@/lib/admin-data'

type AgendaData = Awaited<ReturnType<typeof getAgendaData>>
type Session = AgendaData['sessions'][number]

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const RESERVATION_STATUS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  no_show: 'Absente',
} as const

function formatShortDate(date: string) {
  return SHORT_DATE_FORMAT.format(new Date(`${date}T12:00:00Z`))
}

function firstSessionId(sessions: Array<Session>, weekStart: string) {
  const weekEnd = addDaysIso(weekStart, 6)
  const inWeek = sessions.find((s) => s.date >= weekStart && s.date <= weekEnd)
  return (inWeek ?? sessions[0])?.id ?? null
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue'
}

export function AgendaManager({ data, today: todayProp }: { data: AgendaData; today?: string }) {
  const router = useRouter()
  const today = todayProp ?? parisToday()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [selectedId, setSelectedId] = useState<string | null>(
    () => firstSessionId(data.sessions, startOfWeek(today)),
  )
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | undefined
  >()

  const selected = data.sessions.find((session) => session.id === selectedId) ?? null

  useEffect(() => {
    if (data.sessions.length === 0) setSelectedId(null)
    else if (!data.sessions.some((session) => session.id === selectedId)) {
      setSelectedId(firstSessionId(data.sessions, weekStart))
    }
  }, [data.sessions, selectedId, weekStart])

  async function runAction(label: string, action: () => Promise<unknown>, success: string) {
    setPendingAction(label)
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
      setPendingAction(null)
    }
  }

  return (
    <div className="tara-admin-page tara-agenda-page">
      <ReservationsTabs />
      <div className="tara-page-heading tara-agenda-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Atelier libre</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">
            Planning de l’atelier
          </h1>
          <p className="tara-page-intro">
            Pilotez les créneaux, les places disponibles et les réservations prises par téléphone
            ou sur place. Les horaires habituels se règlent dans l’onglet Réglages.
          </p>
        </div>
      </div>

      {feedback ? <Feedback kind={feedback.kind}>{feedback.message}</Feedback> : null}

      {data.sessions.length === 0 ? (
        <EmptyAgenda />
      ) : (
        <div className="tara-agenda-layout">
          <WeekCalendar
            sessions={data.sessions}
            templates={data.templates}
            weekStart={weekStart}
            today={today}
            selectedId={selectedId}
            onChangeWeek={setWeekStart}
            onSelect={setSelectedId}
          />
          <aside className="tara-agenda-detail">
            {selected ? (
              <SessionDetails
                key={selected.id}
                session={selected}
                pendingAction={pendingAction}
                onRunAction={runAction}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-[#4A5D2E]/25 p-8 text-center text-sm text-neutral-500">
                Sélectionnez un créneau pour afficher son détail.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
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

function SessionDetails({
  session,
  pendingAction,
  onRunAction,
}: {
  session: Session
  pendingAction: string | null
  onRunAction: (label: string, action: () => Promise<unknown>, success: string) => Promise<boolean>
}) {
  const activeReservations = session.reservations.filter((reservation) =>
    ['pending', 'confirmed'].includes(reservation.status),
  )
  const freePlaces = Math.max(session.capacity - session.reserved, 0)

  async function submitCapacity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onRunAction(
      'capacity',
      () =>
        updateSessionCapacity({
          data: { sessionId: session.id, capacity: Number(form.get('capacity')) },
        }),
      'Capacité mise à jour.',
    )
  }

  async function submitReservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    const success = await onRunAction(
      'reservation',
      () =>
        createManualReservation({
          data: {
            sessionId: session.id,
            customerName: String(form.get('name') ?? ''),
            customerEmail: String(form.get('email') ?? ''),
            customerPhone: String(form.get('phone') ?? ''),
            partySize: Number(form.get('partySize')),
            notes: String(form.get('notes') ?? ''),
          },
        }),
      'Réservation manuelle ajoutée.',
    )
    if (success) target.reset()
  }

  return (
    <div className="tara-session-panel">
      <div className="tara-session-panel__header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium capitalize text-[#4A5D2E]">
              {formatShortDate(session.date)}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tabular-nums text-[#1A1815]">
              {session.time.slice(0, 5)}
            </h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              session.status === 'blocked'
                ? 'bg-red-100 text-red-700'
                : 'bg-[#E4ECD8] text-[#31421E]'
            }`}
          >
            {session.status === 'blocked' ? 'Bloqué' : 'Ouvert'}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <Users size={15} aria-hidden="true" /> {session.reserved}/{session.capacity} places
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={15} aria-hidden="true" /> {session.durationMinutes} min
          </span>
        </div>
      </div>

      <div className="tara-session-panel__body">
        <section aria-labelledby="session-actions-title">
          <h3 id="session-actions-title" className="text-sm font-semibold text-[#1A1815]">
            Gestion du créneau
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionButton
              danger={session.status !== 'blocked'}
              disabled={pendingAction !== null}
              icon={session.status === 'blocked' ? <Unlock size={15} /> : <Ban size={15} />}
              onClick={() =>
                onRunAction(
                  'slot-status',
                  () =>
                    setSessionBlocked({
                      data: {
                        sessionId: session.id,
                        scope: 'slot',
                        blocked: session.status !== 'blocked',
                      },
                    }),
                  session.status === 'blocked' ? 'Créneau rouvert.' : 'Créneau bloqué.',
                )
              }
            >
              {session.status === 'blocked' ? 'Rouvrir' : 'Bloquer'}
            </ActionButton>
            <ActionButton
              danger
              disabled={pendingAction !== null}
              icon={<CalendarDays size={15} />}
              onClick={() => {
                if (!window.confirm('Bloquer tous les créneaux de cette journée ?')) return
                void onRunAction(
                  'day-status',
                  () =>
                    setSessionBlocked({
                      data: { sessionId: session.id, scope: 'day', blocked: true },
                  }),
                  'Tous les créneaux de la journée sont bloqués.',
                )
              }}
            >
              Bloquer le jour
            </ActionButton>
          </div>

          <form onSubmit={submitCapacity} className="mt-3 flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-medium text-neutral-600">
              Capacité de ce créneau
              <input
                name="capacity"
                type="number"
                min={Math.max(session.reserved, 1)}
                max={50}
                defaultValue={session.capacity}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none transition-colors focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15"
              />
            </label>
            <button
              type="submit"
              disabled={pendingAction !== null}
              className="min-h-10 rounded-lg border border-[#4A5D2E] px-3 text-sm font-semibold text-[#4A5D2E] transition-colors hover:bg-[#4A5D2E]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Modifier
            </button>
          </form>
        </section>

        <section className="border-t border-[#4A5D2E]/12 pt-5" aria-labelledby="reservations-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="reservations-title" className="text-sm font-semibold text-[#1A1815]">
              Réservations
            </h3>
            <span className="text-xs text-neutral-500">{activeReservations.length} dossier(s)</span>
          </div>

          {session.reservations.length === 0 ? (
            <p className="mt-3 rounded-lg bg-[#F8F6F1] px-3 py-3 text-sm text-neutral-600">
              Aucune réservation pour ce créneau.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {session.reservations.map((reservation) => (
                <li key={reservation.id} className="rounded-lg bg-[#F8F6F1] px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1A1815]">
                        {reservation.customerName}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {reservation.partySize} personne{reservation.partySize > 1 ? 's' : ''} ·{' '}
                        {reservation.source === 'manual' ? 'Manuelle' : 'En ligne'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-neutral-600">
                      {RESERVATION_STATUS[reservation.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-xs text-neutral-600">
                    <a
                      href={`mailto:${reservation.customerEmail}`}
                      className="inline-flex items-center gap-1.5 hover:text-[#4A5D2E]"
                    >
                      <Mail size={13} aria-hidden="true" /> {reservation.customerEmail}
                    </a>
                    {reservation.customerPhone ? (
                      <a
                        href={`tel:${reservation.customerPhone}`}
                        className="inline-flex items-center gap-1.5 hover:text-[#4A5D2E]"
                      >
                        <Phone size={13} aria-hidden="true" /> {reservation.customerPhone}
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-[#4A5D2E]/12 pt-5" aria-labelledby="manual-title">
          <h3 id="manual-title" className="text-sm font-semibold text-[#1A1815]">
            Ajouter une réservation manuelle
          </h3>
          {session.status === 'blocked' ? (
            <p className="mt-3 text-sm text-red-700">
              Rouvrez le créneau avant d&apos;ajouter une réservation.
            </p>
          ) : freePlaces === 0 ? (
            <p className="mt-3 text-sm text-neutral-600">
              Ce créneau est complet. Augmentez sa capacité avant d&apos;ajouter une réservation.
            </p>
          ) : (
            <form onSubmit={submitReservation} className="mt-3 space-y-3">
              <Field label="Nom" name="name" autoComplete="name" required />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
                <Field label="Téléphone" name="phone" type="tel" autoComplete="tel" />
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <Field
                  label="Personnes"
                  name="partySize"
                  type="number"
                  min="1"
                  max={freePlaces}
                  required
                />
                <Field label="Note interne" name="notes" />
              </div>
              <button
                type="submit"
                disabled={pendingAction !== null}
                className="min-h-11 w-full rounded-lg bg-[#4A5D2E] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === 'reservation' ? 'Ajout en cours…' : 'Confirmer la réservation'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

function ActionButton({
  danger = false,
  disabled,
  icon,
  onClick,
  children,
}: {
  danger?: boolean
  disabled: boolean
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? 'border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-red-600'
          : 'border-[#4A5D2E]/30 text-[#4A5D2E] hover:bg-[#4A5D2E]/8 focus-visible:outline-[#4A5D2E]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Field({ label, name, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
}) {
  return (
    <label className="block text-xs font-medium text-neutral-600">
      {label}
      <input
        {...props}
        name={name}
        type={type}
        className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none transition-colors placeholder:text-neutral-500 focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15"
      />
    </label>
  )
}

function EmptyAgenda() {
  return (
    <div className="tara-empty-agenda">
      <CalendarDays className="mx-auto text-[#4A5D2E]" size={28} aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-[#1A1815]">Aucun créneau à venir</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Définissez les jours, horaires et capacités habituels de l&apos;atelier pour générer le
        planning.
      </p>
      <Link
        to="/admin/reglages"
        className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#4A5D2E] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
      >
        Définir les horaires
      </Link>
    </div>
  )
}
