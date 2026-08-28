import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'

// Listing global des réservations (ateliers libres + événements du programme), pour que Tara
// suive qui a réservé quoi, tous statuts confondus. Les tables n'ont pas de relations déclarées
// dans database.types.ts (généré par introspection) : on joint donc à la main, comme getAgendaData.

function throwDatabaseError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

export const listReservations = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const { data: rows, error } = await db
      .from('reservations')
      .select(
        'id, session_instance_id, event_id, party_size, customer_name, customer_email, customer_phone, status, source, notes, created_at',
      )
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

    const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]))
    const eventById = new Map((events ?? []).map((e) => [e.id, e]))

    return reservations.map((r) => {
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
      return {
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
      }
    })
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
    const today = new Date().toISOString().slice(0, 10)
    const [{ data: sessions, error: sessionsError }, { data: events, error: eventsError }] = await Promise.all([
      db
        .from('session_instances')
        .select('id, session_date, start_time')
        .eq('status', 'open')
        .gte('session_date', today)
        .order('session_date')
        .order('start_time')
        .limit(120),
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
