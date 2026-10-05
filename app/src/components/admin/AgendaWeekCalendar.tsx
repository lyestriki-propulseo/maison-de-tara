import { useMemo } from 'react'
import { Ban, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDaysIso } from '@/lib/paris-date'
import type { getAgendaData } from '@/lib/admin-data'

type AgendaData = Awaited<ReturnType<typeof getAgendaData>>
type Session = AgendaData['sessions'][number]

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const CALENDAR_DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
})

const RANGE_DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

function parseIsoDate(date: string) {
  return new Date(`${date}T12:00:00Z`)
}

export function formatDate(date: string) {
  return DAY_FORMAT.format(parseIsoDate(date))
}

export function startOfWeek(date: string) {
  const offset = (parseIsoDate(date).getUTCDay() + 6) % 7
  return addDaysIso(date, -offset)
}

/** « 28 sept. – 4 oct. 2026 », « 5 – 11 oct. 2026 », « 29 déc. 2026 – 4 janv. 2027 ». */
export function formatWeekRange(weekStart: string) {
  const end = addDaysIso(weekStart, 6)
  const startYear = weekStart.slice(0, 4)
  const endYear = end.slice(0, 4)
  const startLabel = RANGE_DAY_FORMAT.format(parseIsoDate(weekStart))
  const endLabel = RANGE_DAY_FORMAT.format(parseIsoDate(end))
  if (startYear !== endYear) return `${startLabel} ${startYear} – ${endLabel} ${endYear}`
  if (weekStart.slice(5, 7) === end.slice(5, 7)) {
    const startDay = startLabel.split(' ')[0]
    return `${startDay} – ${endLabel} ${endYear}`
  }
  return `${startLabel} – ${endLabel} ${endYear}`
}

export function WeekCalendar({
  sessions,
  templates,
  weekStart,
  today,
  selectedId,
  onChangeWeek,
  onSelect,
}: {
  sessions: Array<Session>
  templates: AgendaData['templates']
  weekStart: string
  today: string
  selectedId: string | null
  onChangeWeek: (date: string) => void
  onSelect: (id: string) => void
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index)), [weekStart])
  const weekEnd = days.at(-1) ?? weekStart
  const currentWeekStart = startOfWeek(today)
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

  return (
    <section className="tara-week-calendar" aria-label={`Semaine du ${formatDate(weekStart)}`}>
      <header className="tara-week-calendar__toolbar">
        <div className="tara-week-calendar__navigation">
          <button
            type="button"
            onClick={() => onChangeWeek(addDaysIso(weekStart, -7))}
            disabled={weekStart <= currentWeekStart}
            aria-label="Semaine précédente"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <h2>{formatWeekRange(weekStart)}</h2>
          <button type="button" onClick={() => onChangeWeek(addDaysIso(weekStart, 7))} aria-label="Semaine suivante">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="tara-week-calendar__today" onClick={() => onChangeWeek(currentWeekStart)}>
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
            const isToday = date === today
            const isPast = date < today
            return (
              <div
                key={date}
                className={`tara-week-calendar__day ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`}
                data-past={isPast ? '' : undefined}
              >
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
              const isPast = date < today
              return (
                <div
                  className={`tara-week-calendar__cell ${isPast ? 'is-past' : ''}`}
                  data-past={isPast ? '' : undefined}
                  key={`${date}-${time}`}
                >
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
