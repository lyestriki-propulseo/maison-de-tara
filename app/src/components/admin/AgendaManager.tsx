import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  Phone,
  Plus,
  Settings2,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react'
import type { ScheduleSlot } from '@/lib/admin-schedule'
import type { getAgendaData } from '@/lib/admin-data'
import {
  createManualReservation,
  saveScheduleGrid,
  setSessionBlocked,
  updateSessionCapacity,
} from '@/lib/admin-data'

type AgendaData = Awaited<ReturnType<typeof getAgendaData>>
type Session = AgendaData['sessions'][number]
type EditorSlot = ScheduleSlot & { key: string }

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
})

const CALENDAR_DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
})

const WEEKDAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
]

const RESERVATION_STATUS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  no_show: 'Absente',
} as const

function formatDate(date: string, short = false) {
  const value = new Date(`${date}T12:00:00Z`)
  return (short ? SHORT_DATE_FORMAT : DAY_FORMAT).format(value)
}

function parseIsoDate(date: string) {
  return new Date(`${date}T12:00:00Z`)
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: string, amount: number) {
  const value = parseIsoDate(date)
  value.setUTCDate(value.getUTCDate() + amount)
  return toIsoDate(value)
}

function startOfWeek(date: string) {
  const value = parseIsoDate(date)
  const offset = (value.getUTCDay() + 6) % 7
  value.setUTCDate(value.getUTCDate() - offset)
  return toIsoDate(value)
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue'
}

export function AgendaManager({ data }: { data: AgendaData }) {
  const router = useRouter()
  const [view, setView] = useState<'agenda' | 'grid'>('agenda')
  const [selectedId, setSelectedId] = useState<string | null>(data.sessions[0]?.id ?? null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | undefined
  >()
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(data.sessions[0]?.date ?? toIsoDate(new Date())),
  )

  const selected = data.sessions.find((session) => session.id === selectedId) ?? null
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, Array<Session>>()
    for (const session of data.sessions) {
      const current = groups.get(session.date) ?? []
      current.push(session)
      groups.set(session.date, current)
    }
    return [...groups.entries()]
  }, [data.sessions])

  useEffect(() => {
    if (data.sessions.length === 0) setSelectedId(null)
    else if (!data.sessions.some((session) => session.id === selectedId)) {
      setSelectedId(data.sessions.at(0)?.id ?? null)
    }
  }, [data.sessions, selectedId])

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
      <div className="tara-page-heading tara-agenda-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Atelier</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">Agenda</h1>
          <p className="tara-page-intro">
            Pilotez les créneaux, les places disponibles et les réservations prises par téléphone
            ou sur place.
          </p>
        </div>

        <div className="tara-view-switcher">
          <ViewButton
            active={view === 'agenda'}
            icon={<CalendarDays size={16} aria-hidden="true" />}
            onClick={() => setView('agenda')}
          >
            Agenda
          </ViewButton>
          <ViewButton
            active={view === 'grid'}
            icon={<Settings2 size={16} aria-hidden="true" />}
            onClick={() => setView('grid')}
          >
            Définir les horaires
          </ViewButton>
        </div>
      </div>

      {feedback ? <Feedback kind={feedback.kind}>{feedback.message}</Feedback> : null}

      {view === 'grid' ? (
        <ScheduleGridEditor
          templates={data.templates}
          pending={pendingAction === 'grid'}
          onSave={(slots) =>
            runAction(
              'grid',
              () => saveScheduleGrid({ data: { slots } }),
              'Grille enregistrée et prochains créneaux générés.',
            )
          }
        />
      ) : data.sessions.length === 0 ? (
        <EmptyAgenda onDefineGrid={() => setView('grid')} />
      ) : (
        <div className="tara-agenda-layout">
          <WeekCalendar
            sessions={data.sessions}
            templates={data.templates}
            weekStart={weekStart}
            selectedId={selectedId}
            onChangeWeek={setWeekStart}
            onSelect={setSelectedId}
          />
          <div className="hidden">
            {groupedSessions.map(([date, sessions]) => (
              <section key={date}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold capitalize text-[#1A1815]">
                    {formatDate(date)}
                  </h2>
                  <span className="text-xs text-neutral-500">
                    {sessions.length} créneau{sessions.length > 1 ? 'x' : ''}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
                  {sessions.map((session, index) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      selected={session.id === selectedId}
                      separated={index > 0}
                      onSelect={() => setSelectedId(session.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

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

function ViewButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 flex-none items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] ${
        active ? 'bg-[#4A5D2E] text-white' : 'text-neutral-600 hover:bg-[#4A5D2E]/8'
      }`}
      aria-pressed={active}
    >
      {icon}
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

function WeekCalendar({
  sessions,
  templates,
  weekStart,
  selectedId,
  onChangeWeek,
  onSelect,
}: {
  sessions: Array<Session>
  templates: AgendaData['templates']
  weekStart: string
  selectedId: string | null
  onChangeWeek: (date: string) => void
  onSelect: (id: string) => void
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const weekEnd = days.at(-1) ?? weekStart
  const weekSessions = useMemo(
    () => sessions.filter((session) => session.date >= weekStart && session.date <= weekEnd),
    [sessions, weekEnd, weekStart],
  )
  const times = useMemo(() => {
    const values = new Set<string>()
    for (const session of weekSessions) values.add(session.time.slice(0, 5))
    if (values.size === 0) {
      for (const template of templates) values.add(template.startTime.slice(0, 5))
    }
    if (values.size === 0) {
      values.add('10:00')
      values.add('14:00')
    }
    return [...values].sort()
  }, [templates, weekSessions])
  const sessionLookup = useMemo(
    () => new Map(weekSessions.map((session) => [`${session.date}-${session.time.slice(0, 5)}`, session])),
    [weekSessions],
  )
  const monthLabel = MONTH_FORMAT.format(parseIsoDate(weekStart))

  return (
    <section className="tara-week-calendar" aria-label={`Semaine du ${formatDate(weekStart)}`}>
      <header className="tara-week-calendar__toolbar">
        <div className="tara-week-calendar__navigation">
          <button type="button" onClick={() => onChangeWeek(addDays(weekStart, -7))} aria-label="Semaine précédente">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <h2>{monthLabel}</h2>
          <button type="button" onClick={() => onChangeWeek(addDays(weekStart, 7))} aria-label="Semaine suivante">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="tara-week-calendar__today" onClick={() => onChangeWeek(startOfWeek(toIsoDate(new Date())))}>
          Aujourd’hui
        </button>
      </header>

      <div className="tara-week-calendar__scroller">
        <div className="tara-week-calendar__grid" style={{ '--calendar-rows': times.length } as React.CSSProperties}>
          <div className="tara-week-calendar__corner" />
          {days.map((date) => {
            const parts = CALENDAR_DAY_FORMAT.formatToParts(parseIsoDate(date))
            const weekday = parts.find((part) => part.type === 'weekday')?.value.replace('.', '') ?? ''
            const day = parts.find((part) => part.type === 'day')?.value ?? ''
            const isToday = date === toIsoDate(new Date())
            return (
              <div key={date} className={`tara-week-calendar__day ${isToday ? 'is-today' : ''}`}>
                <span>{weekday}</span>
                <strong>{day}</strong>
              </div>
            )
          })}

          {times.flatMap((time) => [
            <div className="tara-week-calendar__time" key={`time-${time}`}>{time}</div>,
            ...days.map((date) => {
              const session = sessionLookup.get(`${date}-${time}`)
              const free = session ? Math.max(session.capacity - session.reserved, 0) : 0
              const isFull = session ? session.reserved >= session.capacity : false
              return (
                <div className="tara-week-calendar__cell" key={`${date}-${time}`}>
                  {session ? (
                    <button
                      type="button"
                      className={`${session.id === selectedId ? 'is-selected' : ''} ${isFull ? 'is-full' : ''} ${session.status === 'blocked' ? 'is-blocked' : ''}`}
                      onClick={() => onSelect(session.id)}
                      aria-pressed={session.id === selectedId}
                      aria-label={`${formatDate(date)}, ${time}, ${session.status === 'blocked' ? 'bloqué' : `${session.reserved} réservations sur ${session.capacity}`}`}
                    >
                      {session.status === 'blocked' ? (
                        <><Ban size={14} aria-hidden="true" /><span>Bloqué</span></>
                      ) : (
                        <><strong>{session.reserved}/{session.capacity}</strong><span>{isFull ? 'Complet' : `${free} libre${free > 1 ? 's' : ''}`}</span></>
                      )}
                    </button>
                  ) : null}
                </div>
              )
            }),
          ])}
        </div>
      </div>

      <footer className="tara-week-calendar__legend">
        <span><i className="is-open" /> Disponible</span>
        <span><i className="is-busy" /> Presque complet</span>
        <span><i className="is-full" /> Complet</span>
      </footer>
    </section>
  )
}

function SessionRow({
  session,
  selected,
  separated,
  onSelect,
}: {
  session: Session
  selected: boolean
  separated: boolean
  onSelect: () => void
}) {
  const free = Math.max(session.capacity - session.reserved, 0)
  const fill = session.capacity > 0 ? Math.min((session.reserved / session.capacity) * 100, 100) : 0

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#4A5D2E] ${
        separated ? 'border-t border-[#4A5D2E]/12' : ''
      } ${selected ? 'bg-[#EEF2E8]' : 'hover:bg-[#F8F6F1]'}`}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="w-14 shrink-0">
        <span className="text-lg font-semibold tabular-nums text-[#1A1815]">
          {session.time.slice(0, 5)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {session.status === 'blocked' ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
              <Ban size={14} aria-hidden="true" /> Bloqué
            </span>
          ) : (
            <span className="text-sm font-medium text-neutral-700">
              {free} place{free > 1 ? 's' : ''} libre{free > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-neutral-500">
            {session.reserved}/{session.capacity} réservé{session.reserved > 1 ? 'es' : 'e'}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#4A5D2E]/10" aria-hidden="true">
          <div
            className={`h-full rounded-full ${session.status === 'blocked' ? 'bg-red-300' : 'bg-[#6E844B]'}`}
            style={{ width: `${session.status === 'blocked' ? 100 : fill}%` }}
          />
        </div>
      </div>

      <ChevronRight
        size={18}
        className={`shrink-0 transition-transform ${
          selected ? 'translate-x-0 text-[#4A5D2E]' : 'text-neutral-400 group-hover:translate-x-0.5'
        }`}
        aria-hidden="true"
      />
    </button>
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
              {formatDate(session.date, true)}
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

function ScheduleGridEditor({
  templates,
  pending,
  onSave,
}: {
  templates: AgendaData['templates']
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
            Cette grille sert de modèle. À l&apos;enregistrement, les créneaux manquants des 60
            prochains jours sont créés sans toucher aux créneaux déjà ajustés.
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

function EmptyAgenda({ onDefineGrid }: { onDefineGrid: () => void }) {
  return (
    <div className="tara-empty-agenda">
      <CalendarDays className="mx-auto text-[#4A5D2E]" size={28} aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-[#1A1815]">Aucun créneau à venir</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Définissez les jours, horaires et capacités habituels de l&apos;atelier pour générer le
        planning.
      </p>
      <button
        type="button"
        onClick={onDefineGrid}
        className="mt-5 min-h-11 rounded-lg bg-[#4A5D2E] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
      >
        Définir les horaires
      </button>
    </div>
  )
}
