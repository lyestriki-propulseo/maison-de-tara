import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripeClient } from '@/lib/stripe/client'

const SITE_ORIGIN = 'https://maisondetara.propulseo-site.com'

const bodySchema = z.object({
  mode: z.enum(['atelier', 'evenement']),
  targetId: z.uuid(),
  partySize: z.number().int().min(1).max(20),
  customerName: z.string().trim().min(1),
  customerEmail: z.email(),
  customerPhone: z.string().trim().optional(),
})

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': SITE_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

export async function checkoutHandler(request: Request): Promise<Response> {
  const payload: unknown = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) return json({ message: 'Requête invalide' }, 400)
  const { mode, targetId, partySize, customerName, customerEmail, customerPhone } = parsed.data

  const db = supabaseAdmin()
  const sessionInstanceId = mode === 'atelier' ? targetId : null
  const eventId = mode === 'evenement' ? targetId : null

  // ponytail: Functions absent de database.types.ts (scripts/gen-types.mjs ne les introspecte pas,
  // le générateur maison hardcode `Functions: never` — voir Task 3 report). Cast local le temps que
  // le générateur soit étendu ; aucun impact runtime, la RPC est déjà appelée en JS non typé ailleurs.
  const { data: available, error: availError } = await db.rpc('check_availability' as never, {
    p_session_instance_id: sessionInstanceId,
    p_event_id: eventId,
    p_party_size: partySize,
  } as never)
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
    amountCents = 600 * partySize
    label = 'Atelier libre — Maison de Tara'
  } else {
    const { data: event, error: eventError } = await db
      .from('events')
      .select('title, deposit_enabled, deposit_amount_cents')
      .eq('id', targetId)
      .eq('published', true)
      .maybeSingle()
    if (eventError) return json({ message: 'Impossible de charger l’événement' }, 500)
    if (!event) return json({ message: 'Événement introuvable ou non publié' }, 404)
    amountCents = event.deposit_enabled && event.deposit_amount_cents ? event.deposit_amount_cents * partySize : 0
    label = `${event.title} — Maison de Tara`
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
    // Acompte désactivé sur cet événement : pas de paiement à prendre, réservation confirmée
    // directement (même fonction que le webhook, montant 0).
    const { data: id, error } = await db.rpc('confirm_reservation_payment' as never, {
      p_session_instance_id: sessionInstanceId,
      p_event_id: eventId,
      p_party_size: partySize,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone ?? null,
      p_stripe_checkout_session_id: `free-${crypto.randomUUID()}`,
      p_stripe_payment_intent_id: null,
      p_amount_cents: 0,
    } as never)
    if (error) return json({ message: error.message }, 400)
    return json({ url: `${SITE_ORIGIN}/confirmation-reservation.html?id=${id}` })
  }

  const stripe = stripeClient()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
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
    success_url: `${SITE_ORIGIN}/confirmation-reservation.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_ORIGIN}/atelier.html?paiement=annule#reserver`,
  })

  if (!session.url) return json({ message: 'Stripe n’a pas renvoyé de lien de paiement' }, 500)
  return json({ url: session.url })
}

export const Route = createFileRoute('/api/reservations/checkout')({
  server: {
    handlers: {
      POST: ({ request }) => checkoutHandler(request),
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
    },
  },
})
