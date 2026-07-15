import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

// Créneaux d'atelier à venir (14 j) avec le nombre de places déjà réservées (résas actives).
export const getUpcomingSessions = createServerFn({ method: 'GET' }).handler(async () => {
  const db = supabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  const { data: sessions } = await db
    .from('session_instances')
    .select('id, session_date, start_time, capacity, status')
    .gte('session_date', today)
    .order('session_date')
    .order('start_time')
    .limit(200)

  const rows = sessions ?? []
  const ids = rows.map((s) => s.id)

  const reservedBySession = new Map<string, number>()
  if (ids.length > 0) {
    const { data: resas } = await db
      .from('reservations')
      .select('session_instance_id, party_size, status')
      .in('session_instance_id', ids)
      .in('status', ['pending', 'confirmed'])
    for (const r of resas ?? []) {
      if (!r.session_instance_id) continue
      reservedBySession.set(
        r.session_instance_id,
        (reservedBySession.get(r.session_instance_id) ?? 0) + r.party_size,
      )
    }
  }

  return rows.map((s) => ({
    id: s.id,
    date: s.session_date,
    time: s.start_time,
    capacity: s.capacity,
    status: s.status,
    reserved: reservedBySession.get(s.id) ?? 0,
  }))
})
