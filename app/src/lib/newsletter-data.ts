import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'

export const listNewsletterSubscribers = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('newsletter_subscribers')
      .select('id, email, status, confirmed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message || 'Impossible de charger les inscrits à la newsletter')

    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
    }))
  })
