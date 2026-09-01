import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripeClient } from '@/lib/stripe/client'

async function handleCheckoutCompleted(session: {
  id: string
  payment_intent: string | null
  amount_total: number | null
  metadata: Record<string, string> | null
}) {
  const m = session.metadata ?? {}
  const db = supabaseAdmin()

  // ponytail: Functions absent de database.types.ts (scripts/gen-types.mjs ne les introspecte pas,
  // le générateur maison hardcode `Functions: never` — voir Task 3 report). Cast local le temps que
  // le générateur soit étendu ; aucun impact runtime, la RPC est déjà appelée en JS non typé ailleurs.
  const { error } = await db.rpc('confirm_reservation_payment' as never, {
    p_session_instance_id: m.sessionInstanceId || null,
    p_event_id: m.eventId || null,
    p_party_size: Number(m.partySize) || 0,
    p_customer_name: m.customerName ?? '',
    p_customer_email: m.customerEmail ?? '',
    p_customer_phone: m.customerPhone || null,
    p_stripe_checkout_session_id: session.id,
    p_stripe_payment_intent_id: session.payment_intent,
    p_amount_cents: session.amount_total ?? 0,
  } as never)

  if (error) {
    // La place a été prise entre l'ouverture de la session Stripe et la confirmation du paiement
    // (course rare sur la toute dernière place, cf. spec §2) : on rembourse automatiquement plutôt
    // que de laisser un client payé sans réservation.
    console.error('[webhook:stripe] confirm_reservation_payment a échoué, remboursement :', error.message, {
      sessionId: session.id,
      customerEmail: m.customerEmail,
    })
    if (session.payment_intent) {
      const stripe = stripeClient()
      await stripe.refunds.create({ payment_intent: session.payment_intent }).catch((refundErr) => {
        console.error('[webhook:stripe] échec du remboursement automatique :', refundErr, { sessionId: session.id })
      })
    }
  }
}

export async function webhookHandler(request: Request): Promise<Response> {
  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Unauthorized', { status: 401 })

  const rawBody = await request.text()
  const stripe = stripeClient()

  let event: { type: string; data: { object: unknown } }
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook:stripe] signature invalide :', err)
    return new Response('Bad request', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(
      event.data.object as {
        id: string
        payment_intent: string | null
        amount_total: number | null
        metadata: Record<string, string> | null
      },
    )
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
}

export const Route = createFileRoute('/api/webhooks/stripe')({
  server: { handlers: { POST: ({ request }) => webhookHandler(request) } },
})
