import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'

export const listRequests = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('requests')
      .select('id, request_type, status, name, email, phone, message, party_size, desired_date, event_type, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message || 'Impossible de charger les demandes')

    return (data ?? []).map((row) => ({
      id: row.id,
      requestType: row.request_type,
      status: row.status,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      partySize: row.party_size,
      desiredDate: row.desired_date,
      eventType: row.event_type,
      createdAt: row.created_at,
    }))
  })
