import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripeClient } from '@/lib/stripe/client'

async function handleCheckoutCompleted(session: {
  id: string
  payment_intent: string | null
  amount_total: number | null
  payment_status: string
  metadata: Record<string, string> | null
}): Promise<{ retry: boolean }> {
  if (session.payment_status !== 'paid') {
    // Mode de paiement différé (SEPA, Klarna...) : le paiement n'est pas encore confirmé. La
    // session est créée avec payment_method_types: ['card'] (toujours synchrone), donc ce cas ne
    // devrait jamais arriver en pratique — garde-fou défensif seulement.
    return { retry: false }
  }

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
    const isBusinessError = (error as { code?: string }).code === '23514'
    console.error('[webhook:stripe] confirm_reservation_payment a échoué :', error.message, {
      sessionId: session.id,
      customerEmail: m.customerEmail,
      businessError: isBusinessError,
    })

    if (!isBusinessError) {
      // Erreur inattendue (DB indisponible, permission manquante...) : ne pas rembourser, laisser
      // Stripe re-livrer l'événement plus tard plutôt que de le déclarer traité à tort.
      return { retry: true }
    }

    // Erreur métier attendue (capacité prise entre-temps, cooldown, validation) : terminale, on
    // rembourse plutôt que de laisser un client payé sans réservation (cf. spec §2).
    if (session.payment_intent) {
      const stripe = stripeClient()
      await stripe.refunds.create({ payment_intent: session.payment_intent }).catch((refundErr) => {
        console.error('[webhook:stripe] échec du remboursement automatique :', refundErr, { sessionId: session.id })
      })
    }
  }

  return { retry: false }
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
    const { retry } = await handleCheckoutCompleted(
      event.data.object as {
        id: string
        payment_intent: string | null
        amount_total: number | null
        payment_status: string
        metadata: Record<string, string> | null
      },
    )
    if (retry) {
      return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
}

export const Route = createFileRoute('/api/webhooks/stripe')({
  server: { handlers: { POST: ({ request }) => webhookHandler(request) } },
})
