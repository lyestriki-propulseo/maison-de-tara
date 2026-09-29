import { createClient } from '@supabase/supabase-js'
import { TEST_PREFIX, e2eEnv } from './env'
import type { DatabaseWithRpc } from '@/types/database-rpc.types'

// Accès service_role réservé aux tests : préparer, vérifier en base, et surtout NETTOYER.
export function testDb() {
  return createClient<DatabaseWithRpc>(e2eEnv.supabaseUrl(), e2eEnv.serviceRoleKey(), {
    auth: { persistSession: false },
  })
}

export type Slot = {
  id: string
  session_date: string
  start_time: string
  duration_minutes: number
  capacity: number
  note: string | null
}

// Créneau cible des tests : le dernier créneau ouvert à venir, sans réservation ni note, avec au
// moins 2 places (pour tester la capacité). Le plus lointain possible = le moins visité.
export async function pickTestSlot(): Promise<Slot> {
  const db = testDb()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await db
    .from('session_instances')
    .select('id, session_date, start_time, duration_minutes, capacity, note')
    .eq('status', 'open')
    .gte('session_date', today)
    .is('note', null)
    .gte('capacity', 2)
    .order('session_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(20)
  if (error) throw error
  for (const slot of data) {
    const { count } = await db
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('session_instance_id', slot.id)
    if (!count) return slot
  }
  throw new Error('Aucun créneau libre utilisable pour les tests')
}

export async function readSlot(id: string) {
  const { data, error } = await testDb()
    .from('session_instances')
    .select('status, capacity, note, blocked_by_event_id')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function restoreSlot(slot: Slot) {
  const { error } = await testDb()
    .from('session_instances')
    .update({ status: 'open', capacity: slot.capacity, note: slot.note, blocked_by_event_id: null })
    .eq('id', slot.id)
  if (error) throw error
}

// Supprime tout ce que les tests ont pu créer : réservations e2e+…@example.com, événements [TEST]
// (après avoir rouvert les créneaux qu'ils privatisaient).
export async function cleanupTestData() {
  const db = testDb()
  const { error: resaError } = await db
    .from('reservations')
    .delete()
    .like('customer_email', 'e2e+%@example.com')
  if (resaError) throw resaError

  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id')
    .like('title', `${TEST_PREFIX}%`)
  if (eventsError) throw eventsError
  for (const event of events) {
    await db.rpc('sync_event_privatisation', { p_event_id: event.id, p_release_only: true })
    const { error } = await db.from('events').delete().eq('id', event.id)
    if (error) throw error
  }
}

// « 2026-11-24 » + « 10:00:00 » → libellé du bouton de l'agenda : « mardi 24 novembre, 10:00 »
export function slotAriaPrefix(slot: Pick<Slot, 'session_date' | 'start_time'>) {
  const day = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${slot.session_date}T12:00:00Z`))
  return `${day}, ${slot.start_time.slice(0, 5)}`
}
