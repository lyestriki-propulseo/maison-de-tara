import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'
import { canPublishEvent, effectivePriceCents, eventInputSchema, slugify } from '@/lib/events'

// CRUD des événements du programme. Lecture/écriture côté serveur (service_role) + garde staff.
// Le site public lit séparément les événements PUBLIÉS en anon (RLS).

function throwDatabaseError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

type PrivatisationResult = { blocked: number; reopened: number; reservedConflicts: number }

// Bloque (ou rouvre) les créneaux d'atelier que l'événement privatise — voir la migration
// 20260929100000_event_privatisation.sql. Aussi rappelée après chaque génération de créneaux.
export async function syncPrivatisation(
  db: ReturnType<typeof supabaseAdmin>,
  eventId: string,
  releaseOnly = false,
): Promise<PrivatisationResult> {
  const { data, error } = await db.rpc('sync_event_privatisation', {
    p_event_id: eventId,
    p_release_only: releaseOnly,
  })
  throwDatabaseError(error, 'Impossible de mettre à jour les créneaux privatisés')
  const row = data?.[0]
  return {
    blocked: row?.blocked ?? 0,
    reopened: row?.reopened ?? 0,
    reservedConflicts: row?.reserved_conflicts ?? 0,
  }
}

export const listEvents = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('events')
      .select(
        'id, title, event_type, description, starts_at, ends_at, capacity, deposit_enabled, deposit_amount_cents, privatise, published',
      )
      .order('starts_at', { ascending: true })
    throwDatabaseError(error, 'Impossible de charger les événements')
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      eventType: row.event_type,
      description: row.description ?? '',
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      capacity: row.capacity,
      // Prix par personne (colonne historique `deposit_amount_cents`) ; 0 = pas encore fixé.
      priceCents: effectivePriceCents(row.deposit_enabled, row.deposit_amount_cents),
      privatise: row.privatise,
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
      ends_at: data.endsAt,
      capacity: data.capacity,
      deposit_enabled: true,
      deposit_amount_cents: data.priceCents,
      privatise: data.privatise,
      published: data.published,
      published_at: data.published ? new Date().toISOString() : null,
    }

    if (data.id) {
      const { error } = await db.from('events').update(payload).eq('id', data.id)
      throwDatabaseError(error, 'Impossible de mettre à jour l’événement')
      return { id: data.id, privatisation: await syncPrivatisation(db, data.id) }
    }

    const slug = `${slugify(data.title)}-${crypto.randomUUID().slice(0, 6)}`
    const { data: created, error } = await db
      .from('events')
      .insert({ ...payload, slug })
      .select('id')
      .single()
    throwDatabaseError(error, 'Impossible de créer l’événement')
    if (!created) throw new Error('Impossible de créer l’événement')
    return { id: created.id, privatisation: await syncPrivatisation(db, created.id) }
  })

const MISSING_END_OR_PRICE = 'Ajoutez une heure de fin et un prix avant de publier'

// Publier / dépublier depuis la liste : n'écrit que `published` (+ date), sans revalider tout
// l'événement. Publier exige une fin et un prix ; dépublier passe toujours.
export const setEventPublished = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(z.object({ id: z.uuid(), published: z.boolean() }))
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    if (data.published) {
      const { data: row, error } = await db
        .from('events')
        .select('ends_at, deposit_enabled, deposit_amount_cents')
        .eq('id', data.id)
        .maybeSingle()
      throwDatabaseError(error, 'Impossible de charger l’événement')
      if (!row) throw new Error('Événement introuvable')
      // Même règle que le paiement (api.reservations.checkout) : sans prix actif, pas de publication.
      const priceCents = effectivePriceCents(row.deposit_enabled, row.deposit_amount_cents)
      if (!canPublishEvent({ endsAt: row.ends_at, priceCents })) {
        throw new Error(MISSING_END_OR_PRICE)
      }
    }
    const { error } = await db
      .from('events')
      .update({ published: data.published, published_at: data.published ? new Date().toISOString() : null })
      .eq('id', data.id)
    throwDatabaseError(error, 'Impossible de mettre à jour l’événement')
    return { id: data.id, privatisation: await syncPrivatisation(db, data.id) }
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    // Rouvre d'abord les créneaux que l'événement privatisait (sinon ils resteraient bloqués).
    await syncPrivatisation(db, data.id, true)
    const { error } = await db.from('events').delete().eq('id', data.id)
    throwDatabaseError(error, 'Impossible de supprimer l’événement (des réservations y sont peut-être liées)')
    return { deleted: true }
  })
