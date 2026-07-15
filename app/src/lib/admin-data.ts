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
    db.from('session_instances').select('*', { count: 'exact', head: true }).gte('session_date', today),
    db.from('reservations').select('*', { count: 'exact', head: true }),
  ])

  return {
    subscribers: subscribers.count ?? 0,
    newRequests: newRequests.count ?? 0,
    upcomingSessions: upcomingSessions.count ?? 0,
    reservations: reservations.count ?? 0,
  }
})
