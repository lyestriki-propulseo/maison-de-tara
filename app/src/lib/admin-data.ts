import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  buildFutureSessionInstances,
  capacitySchema,
  manualReservationSchema,
  scheduleGridSchema,
  sessionActionSchema,
} from '@/lib/admin-schedule'

// Lecture des données d'admin côté SERVEUR (clé service_role → contourne la RLS).
// Le navigateur n'accède jamais directement à ces tables (RLS deny-by-default).
export const getDashboardStats = createServerFn({ method: 'GET' }).handler(async () => {
  const db = supabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  const [subscribers, newRequests, upcomingSessions, reservations] = await Promise.all([
    db.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
    db.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'nouvelle'),
    db
      .from('session_instances')
      .select('*', { count: 'exact', head: true })
      .gte('session_date', today),
    db.from('reservations').select('*', { count: 'exact', head: true }),
  ])

  return {
    subscribers: subscribers.count ?? 0,
    newRequests: newRequests.count ?? 0,
    upcomingSessions: upcomingSessions.count ?? 0,
    reservations: reservations.count ?? 0,
  }
})

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function throwDatabaseError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

// Agenda complet : créneaux à venir, réservations liées et grille hebdomadaire active.
export const getAgendaData = createServerFn({ method: 'GET' }).handler(async () => {
  const db = supabaseAdmin()
  const today = todayString()

  const [{ data: sessions, error: sessionsError }, { data: templates, error: templatesError }] =
    await Promise.all([
      db
        .from('session_instances')
        .select('id, session_date, start_time, duration_minutes, capacity, status, note')
        .gte('session_date', today)
        .order('session_date')
        .order('start_time')
        .limit(300),
      db
        .from('session_templates')
        .select('id, weekday, start_time, duration_minutes, capacity, active')
        .eq('active', true)
        .order('weekday')
        .order('start_time'),
    ])

  throwDatabaseError(sessionsError, 'Impossible de charger les créneaux')
  throwDatabaseError(templatesError, 'Impossible de charger la grille')

  const rows = sessions ?? []
  const ids = rows.map((s) => s.id)

  const reservationsBySession = new Map<
    string,
    Array<{
      id: string
      customerName: string
      customerEmail: string
      customerPhone: string | null
      partySize: number
      status: 'pending' | 'confirmed' | 'cancelled' | 'no_show'
      source: 'online' | 'manual'
      notes: string | null
    }>
  >()
  if (ids.length > 0) {
    const { data: reservations, error } = await db
      .from('reservations')
      .select(
        'id, session_instance_id, customer_name, customer_email, customer_phone, party_size, status, source, notes',
      )
      .in('session_instance_id', ids)
      .order('created_at')

    throwDatabaseError(error, 'Impossible de charger les réservations')
    for (const reservation of reservations ?? []) {
      if (!reservation.session_instance_id) continue
      const current = reservationsBySession.get(reservation.session_instance_id) ?? []
      current.push({
        id: reservation.id,
        customerName: reservation.customer_name,
        customerEmail: reservation.customer_email,
        customerPhone: reservation.customer_phone,
        partySize: reservation.party_size,
        status: reservation.status,
        source: reservation.source,
        notes: reservation.notes,
      })
      reservationsBySession.set(reservation.session_instance_id, current)
    }
  }

  return {
    sessions: rows.map((session) => {
      const reservations = reservationsBySession.get(session.id) ?? []
      const reserved = reservations
        .filter((reservation) => ['pending', 'confirmed'].includes(reservation.status))
        .reduce((sum, reservation) => sum + reservation.partySize, 0)
      return {
        id: session.id,
        date: session.session_date,
        time: session.start_time,
        durationMinutes: session.duration_minutes,
        capacity: session.capacity,
        status: session.status,
        note: session.note,
        reserved,
        reservations,
      }
    }),
    templates: (templates ?? []).map((template) => ({
      id: template.id,
      weekday: template.weekday,
      startTime: template.start_time.slice(0, 5),
      durationMinutes: template.duration_minutes,
      capacity: template.capacity,
    })),
  }
})

export const setSessionBlocked = createServerFn({ method: 'POST' })
  .validator(sessionActionSchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { data: session, error: sessionError } = await db
      .from('session_instances')
      .select('session_date')
      .eq('id', data.sessionId)
      .single()

    throwDatabaseError(sessionError, 'Créneau introuvable')
    if (!session) throw new Error('Créneau introuvable')

    let query = db
      .from('session_instances')
      .update({ status: data.blocked ? 'blocked' : 'open', note: data.note || null })

    query =
      data.scope === 'day'
        ? query.eq('session_date', session.session_date)
        : query.eq('id', data.sessionId)

    const { data: updated, error } = await query.select('id')
    throwDatabaseError(error, 'Impossible de modifier le créneau')
    return { updated: updated?.length ?? 0 }
  })

export const updateSessionCapacity = createServerFn({ method: 'POST' })
  .validator(capacitySchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { data: reservations, error: reservationsError } = await db
      .from('reservations')
      .select('party_size')
      .eq('session_instance_id', data.sessionId)
      .in('status', ['pending', 'confirmed'])

    throwDatabaseError(reservationsError, 'Impossible de contrôler les réservations')
    const reserved = (reservations ?? []).reduce((sum, row) => sum + row.party_size, 0)
    if (data.capacity < reserved) {
      throw new Error(`La capacité ne peut pas être inférieure aux ${reserved} places réservées`)
    }

    const { error } = await db
      .from('session_instances')
      .update({ capacity: data.capacity })
      .eq('id', data.sessionId)
    throwDatabaseError(error, 'Impossible de modifier la capacité')
    return { capacity: data.capacity }
  })

export const createManualReservation = createServerFn({ method: 'POST' })
  .validator(manualReservationSchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { data: reservation, error } = await db
      .from('reservations')
      .insert({
        session_instance_id: data.sessionId,
        party_size: data.partySize,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone || null,
        status: 'confirmed',
        source: 'manual',
        notes: data.notes || null,
      })
      .select('id')
      .single()

    throwDatabaseError(error, 'Impossible de créer la réservation')
    return reservation
  })

export const saveScheduleGrid = createServerFn({ method: 'POST' })
  .validator(scheduleGridSchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { data: existing, error: existingError } = await db
      .from('session_templates')
      .select('id, weekday, start_time')

    throwDatabaseError(existingError, 'Impossible de lire la grille existante')

    const activeTemplates: Array<{
      id: string
      weekday: number
      startTime: string
      durationMinutes: number
      capacity: number
    }> = []
    const reusedIds = new Set<string>()

    for (const slot of data.slots) {
      const match = (existing ?? []).find(
        (template) =>
          !reusedIds.has(template.id) &&
          template.weekday === slot.weekday &&
          template.start_time.slice(0, 5) === slot.startTime,
      )

      if (match) {
        const { error } = await db
          .from('session_templates')
          .update({
            duration_minutes: slot.durationMinutes,
            capacity: slot.capacity,
            active: true,
          })
          .eq('id', match.id)
        throwDatabaseError(error, 'Impossible de mettre à jour la grille')
        reusedIds.add(match.id)
        activeTemplates.push({ id: match.id, ...slot })
      } else {
        const { data: created, error } = await db
          .from('session_templates')
          .insert({
            weekday: slot.weekday,
            start_time: slot.startTime,
            duration_minutes: slot.durationMinutes,
            capacity: slot.capacity,
            active: true,
          })
          .select('id')
          .single()
        throwDatabaseError(error, 'Impossible de créer un élément de grille')
        if (!created) throw new Error('Impossible de créer un élément de grille')
        activeTemplates.push({ id: created.id, ...slot })
      }
    }

    const toDeactivate = (existing ?? [])
      .filter((template) => !reusedIds.has(template.id))
      .map((template) => template.id)
    if (toDeactivate.length > 0) {
      const { error } = await db
        .from('session_templates')
        .update({ active: false })
        .in('id', toDeactivate)
      throwDatabaseError(error, 'Impossible de désactiver les anciens horaires')
    }

    const futureInstances = buildFutureSessionInstances(activeTemplates, todayString(), 60)
    const { error: instancesError } = await db.from('session_instances').upsert(futureInstances, {
      onConflict: 'session_date,start_time',
      ignoreDuplicates: true,
    })
    throwDatabaseError(instancesError, 'Impossible de générer les futurs créneaux')

    return { templates: activeTemplates.length, generated: futureInstances.length }
  })
