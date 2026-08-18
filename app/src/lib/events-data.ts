import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'
import { eventInputSchema, slugify } from '@/lib/events'

// CRUD des événements du programme. Lecture/écriture côté serveur (service_role) + garde staff.
// Le site public lit séparément les événements PUBLIÉS en anon (RLS).

function throwDatabaseError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

export const listEvents = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('events')
      .select(
        'id, title, event_type, description, starts_at, capacity, deposit_enabled, deposit_amount_cents, published',
      )
      .order('starts_at', { ascending: true })
    throwDatabaseError(error, 'Impossible de charger les événements')
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      eventType: row.event_type,
      description: row.description ?? '',
      startsAt: row.starts_at,
      capacity: row.capacity,
      depositEnabled: row.deposit_enabled,
      depositAmountCents: row.deposit_amount_cents,
      published: row.published,
    }))
  })

export const upsertEvent = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(eventInputSchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const payload = {
      title: data.title,
      event_type: data.eventType,
      description: data.description || null,
      starts_at: data.startsAt,
      capacity: data.capacity,
      deposit_enabled: data.depositEnabled,
      deposit_amount_cents: data.depositEnabled ? (data.depositAmountCents ?? 0) : null,
      published: data.published,
      published_at: data.published ? new Date().toISOString() : null,
    }

    if (data.id) {
      const { error } = await db.from('events').update(payload).eq('id', data.id)
      throwDatabaseError(error, 'Impossible de mettre à jour l’événement')
      return { id: data.id }
    }

    const slug = `${slugify(data.title)}-${crypto.randomUUID().slice(0, 6)}`
    const { data: created, error } = await db
      .from('events')
      .insert({ ...payload, slug })
      .select('id')
      .single()
    throwDatabaseError(error, 'Impossible de créer l’événement')
    if (!created) throw new Error('Impossible de créer l’événement')
    return { id: created.id }
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { error } = await db.from('events').delete().eq('id', data.id)
    throwDatabaseError(error, 'Impossible de supprimer l’événement (des réservations y sont peut-être liées)')
    return { deleted: true }
  })
