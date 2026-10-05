import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripeClient } from '@/lib/stripe/client'
import { readAtelierDepositCents } from '@/lib/booking-settings-data'

const PRIMARY_SITE_ORIGIN = 'https://maisondetara.com'
// L'ancien domaine reste accepté pendant la transition vers maisondetara.com.
const SITE_ORIGINS = [PRIMARY_SITE_ORIGIN, 'https://www.maisondetara.com', 'https://maisondetara.propulseo-site.com']

const bodySchema = z.object({
  mode: z.enum(['atelier', 'evenement']),
  targetId: z.uuid(),
  partySize: z.number().int().min(1).max(20),
  customerName: z.string().trim().min(1),
  customerEmail: z.email(),
  customerPhone: z.string().trim().optional(),
})

/** Domaine du site appelant s'il est connu, sinon le domaine principal. */
function siteOrigin(request: Request): string {
  const origin = request.headers.get('Origin') ?? ''
  return SITE_ORIGINS.includes(origin) ? origin : PRIMARY_SITE_ORIGIN
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

export async function checkoutHandler(request: Request): Promise<Response> {
  const site = siteOrigin(request)
  const json = (body: unknown, status = 200) => jsonResponse(body, status, site)

  const payload: unknown = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) return json({ message: 'Requête invalide' }, 400)
  const { mode, targetId, partySize, customerName, customerEmail, customerPhone } = parsed.data

  const db = supabaseAdmin()
  const sessionInstanceId = mode === 'atelier' ? targetId : null
  const eventId = mode === 'evenement' ? targetId : null

  const { data: available, error: availError } = await db.rpc('check_availability', {
    p_session_instance_id: sessionInstanceId,
    p_event_id: eventId,
    p_party_size: partySize,
  })
  if (availError) return json({ message: 'Impossible de vérifier la disponibilité' }, 500)
  if (!available) {
    return json(
      { message: 'Il ne reste plus assez de places pour ce nombre de personnes. Merci de choisir un autre créneau.' },
      409,
    )
  }

  let amountCents: number
  let label: string
  if (mode === 'atelier') {
    let depositCents: number
    try {
      depositCents = await readAtelierDepositCents(db)
    } catch {
      return json({ message: 'Impossible de calculer l’acompte' }, 500)
    }
    amountCents = depositCents * partySize
    label = `Acompte atelier — ${partySize} pers.`
  } else {
    const { data: event, error: eventError } = await db
      .from('events')
      .select('title, deposit_enabled, deposit_amount_cents')
      .eq('id', targetId)
      .eq('published', true)
      .maybeSingle()
    if (eventError) return json({ message: 'Impossible de charger l’événement' }, 500)
    if (!event) return json({ message: 'Événement introuvable ou non publié' }, 404)
    // Événement = prix complet par personne payé en ligne. Sans prix valide, on refuse :
    // jamais de confirmation gratuite pour un événement (seul l'atelier peut être à 0 €).
    if (!event.deposit_enabled || !event.deposit_amount_cents || event.deposit_amount_cents < 100) {
      return json({ message: 'Cet événement n’est pas encore ouvert à la réservation.' }, 409)
    }
    amountCents = event.deposit_amount_cents * partySize
    label = `${event.title} — ${partySize} pers.`
  }

  const metadata = {
    mode,
    sessionInstanceId: sessionInstanceId ?? '',
    eventId: eventId ?? '',
    partySize: String(partySize),
    customerName,
    customerEmail,
    customerPhone: customerPhone ?? '',
  }

  if (amountCents === 0) {
    // Acompte atelier réglé à 0 € par Tara : pas de paiement,
    // réservation confirmée directement (même fonction que le webhook, montant 0).
    const { data: id, error } = await db.rpc('confirm_reservation_payment', {
      p_session_instance_id: sessionInstanceId,
      p_event_id: eventId,
      p_party_size: partySize,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone ?? null,
      p_stripe_checkout_session_id: `free-${crypto.randomUUID()}`,
      p_stripe_payment_intent_id: null,
      p_amount_cents: 0,
    })
    if (error) {
      console.error('[api:reservations.checkout] confirm_reservation_payment (branche 0€) a échoué :', error.message, { targetId, customerEmail })
      return json({ message: 'Impossible de confirmer la réservation. Merci de réessayer ou de contacter Tara.' }, 400)
    }
    return json({ url: `${site}/confirmation-reservation?id=${id}` })
  }

  const stripe = stripeClient()
  // En mode événement, l'annulation ramène sur le tunnel avec l'événement présélectionné.
  const cancelQuery = eventId ? `paiement=annule&event=${eventId}` : 'paiement=annule'
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: { name: label },
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      metadata,
      success_url: `${site}/confirmation-reservation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/atelier?${cancelQuery}#reserver`,
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error('[api:reservations.checkout] création de la session Stripe échouée :', reason, { targetId })
    return json(
      { message: 'Le paiement en ligne est momentanément indisponible. Merci de réessayer dans quelques minutes.' },
      502,
    )
  }

  if (!session.url) return json({ message: 'Stripe n’a pas renvoyé de lien de paiement' }, 500)
  return json({ url: session.url })
}

export const Route = createFileRoute('/api/reservations/checkout')({
  server: {
    handlers: {
      POST: ({ request }) => checkoutHandler(request),
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: corsHeaders(siteOrigin(request)) }),
    },
  },
})
