import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'
import { parisToday } from '@/lib/paris-date'
import { RESERVATION_WHEN, isUpcoming } from '@/lib/reservations'

// Listing global des réservations (ateliers libres + événements du programme), pour que Tara
// suive qui a réservé quoi, tous statuts confondus. Les tables n'ont pas de relations déclarées
// dans database.types.ts (généré par introspection) : on joint donc à la main, comme getAgendaData.

function throwDatabaseError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

const RESERVATION_COLUMNS =
  'id, session_instance_id, event_id, party_size, customer_name, customer_email, customer_phone, status, source, notes, created_at'
const PAGE_SIZE = 1000
const IN_CHUNK = 100

const PARIS_TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

// PostgREST plafonne une réponse à 1000 lignes : on pagine pour ne rien perdre.
async function fetchAllPages<T>(page: (from: number, to: number) => QueryResult<T>, fallback: string) {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    throwDatabaseError(error, fallback)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}

function chunks(ids: string[]) {
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) out.push(ids.slice(i, i + IN_CHUNK))
  return out
}

type SessionRow = { id: string; session_date: string; start_time: string }
type EventRow = { id: string; title: string; starts_at: string }

// « À venir » : on part des cibles (créneaux et événements d'aujourd'hui ou plus tard, jour de Paris),
// puis on charge leurs réservations par paquets de 100 ids (longueur d'URL de l'API).
async function loadUpcoming(db: ReturnType<typeof supabaseAdmin>, today: string) {
  // Marge d'un jour côté SQL, puis tri fin en mémoire au jour de Paris (pas de calcul de fuseau en SQL).
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const [sessions, rawEvents] = await Promise.all([
    fetchAllPages<SessionRow>(
      (from, to) =>
        db.from('session_instances').select('id, session_date, start_time').gte('session_date', today).order('id').range(from, to),
      'Impossible de charger les créneaux liés',
    ),
    fetchAllPages<EventRow>(
      (from, to) => db.from('events').select('id, title, starts_at').gte('starts_at', since).order('id').range(from, to),
      'Impossible de charger les événements liés',
    ),
  ])
  const events = rawEvents.filter((e) => isUpcoming(parisToday(new Date(e.starts_at)), today))
  const results = await Promise.all([
    ...chunks(sessions.map((s) => s.id)).map((chunk) =>
      db.from('reservations').select(RESERVATION_COLUMNS).in('session_instance_id', chunk),
    ),
    ...chunks(events.map((e) => e.id)).map((chunk) =>
      db.from('reservations').select(RESERVATION_COLUMNS).in('event_id', chunk),
    ),
  ])
  const byId = new Map(
    results.flatMap(({ data, error }) => {
      throwDatabaseError(error, 'Impossible de charger les réservations')
      return (data ?? []).map((r) => [r.id, r] as const)
    }),
  )
  return { reservations: [...byId.values()], sessions, events }
}

// « Passées » : les 300 dernières réservations créées, dont la cible est passée ou supprimée.
async function loadRecent(db: ReturnType<typeof supabaseAdmin>) {
  const { data: rows, error } = await db
    .from('reservations')
    .select(RESERVATION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(300)
  throwDatabaseError(error, 'Impossible de charger les réservations')
  const reservations = rows ?? []
  const sessionIds = [...new Set(reservations.map((r) => r.session_instance_id).filter((id) => id != null))]
  const eventIds = [...new Set(reservations.map((r) => r.event_id).filter((id) => id != null))]
  const [{ data: sessions, error: sessionsError }, { data: events, error: eventsError }] = await Promise.all([
    db.from('session_instances').select('id, session_date, start_time').in('id', sessionIds),
    db.from('events').select('id, title, starts_at').in('id', eventIds),
  ])
  throwDatabaseError(sessionsError, 'Impossible de charger les créneaux liés')
  throwDatabaseError(eventsError, 'Impossible de charger les événements liés')
  return { reservations, sessions: sessions ?? [], events: events ?? [] }
}

export const listReservations = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .validator(z.object({ when: z.enum(RESERVATION_WHEN) }))
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const today = parisToday()
    const loaded = data.when === 'upcoming' ? await loadUpcoming(db, today) : await loadRecent(db)

    const sessionById = new Map(loaded.sessions.map((s) => [s.id, s]))
    const eventById = new Map(loaded.events.map((e) => [e.id, e]))

    const entries = loaded.reservations.map((r) => {
      const session = r.session_instance_id ? sessionById.get(r.session_instance_id) : undefined
      const event = r.event_id ? eventById.get(r.event_id) : undefined
      const target = event
        ? { kind: 'event' as const, label: event.title, at: event.starts_at }
        : session
          ? {
              kind: 'atelier' as const,
              label: 'Atelier libre',
              at: `${session.session_date}T${session.start_time}`,
            }
          : { kind: 'inconnu' as const, label: 'Cible supprimée', at: null }
      const targetDay = event ? parisToday(new Date(event.starts_at)) : session ? session.session_date : null
      const startTime = event ? PARIS_TIME.format(new Date(event.starts_at)) : session ? session.start_time.slice(0, 5) : ''
      const row = {
        id: r.id,
        partySize: r.party_size,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone,
        status: r.status,
        source: r.source,
        notes: r.notes,
        createdAt: r.created_at,
        target,
        targetDay,
      }
      return { row, sortKey: `${targetDay ?? ''}T${startTime}` }
    })

    if (data.when === 'past') return entries.map((e) => e.row).filter((r) => !isUpcoming(r.targetDay, today))
    return entries
      .filter((e) => isUpcoming(e.row.targetDay, today))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.row.createdAt.localeCompare(b.row.createdAt))
      .map((e) => e.row)
  })

export const updateReservationStatus = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(
    z.object({
      id: z.uuid(),
      status: z.enum(['pending', 'confirmed', 'cancelled', 'no_show']),
    }),
  )
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { error } = await db.from('reservations').update({ status: data.status }).eq('id', data.id)
    throwDatabaseError(error, 'Impossible de mettre à jour la réservation')
    return { id: data.id, status: data.status }
  })

// Cibles disponibles pour une réservation manuelle : créneaux d'atelier ouverts à venir + événements publiés.
export const listReservationTargets = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const today = parisToday()
    const [{ data: sessions, error: sessionsError }, { data: events, error: eventsError }] = await Promise.all([
      db
        .from('session_instances')
        .select('id, session_date, start_time')
        .eq('status', 'open')
        .gte('session_date', today)
        .order('session_date')
        .order('start_time')
        .limit(400),
      db
        .from('events')
        .select('id, title, starts_at')
        .eq('published', true)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(60),
    ])
    throwDatabaseError(sessionsError, 'Impossible de charger les créneaux')
    throwDatabaseError(eventsError, 'Impossible de charger les événements')

    return {
      sessions: (sessions ?? []).map((s) => ({
        id: s.id,
        label: `Atelier libre · ${s.session_date} ${s.start_time.slice(0, 5)}`,
      })),
      events: (events ?? []).map((e) => ({
        id: e.id,
        label: `${e.title} · ${new Date(e.starts_at).toLocaleDateString('fr-FR')}`,
      })),
    }
  })
