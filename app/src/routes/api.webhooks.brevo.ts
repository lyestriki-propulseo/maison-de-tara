import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/brevo/client'
import {
  newsletterConfirmation,
  reservationAlertForTara,
  reservationConfirmationForCustomer,
  requestAlertForTara,
  requestConfirmationForCustomer,
} from '@/lib/brevo/templates'

const ADMIN_URL = 'https://admin.maisondetara.propulseo-site.com'

type WebhookType = 'reservation' | 'newsletter' | 'request'
type WebhookPayload = { type: WebhookType; id: string }

function isWebhookPayload(value: unknown): value is WebhookPayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (v.type === 'reservation' || v.type === 'newsletter' || v.type === 'request') && typeof v.id === 'string'
}

function logFailures(results: PromiseSettledResult<void>[], context: string) {
  for (const r of results) {
    if (r.status === 'rejected') console.error(`[webhook:${context}]`, r.reason)
  }
}

type Db = ReturnType<typeof supabaseAdmin>

async function handleReservation(db: Db, id: string) {
  const { data: claimed } = await db
    .from('reservations')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id, session_instance_id, event_id, party_size, customer_name, customer_email, customer_phone')
    .maybeSingle()
  if (!claimed) return

  let targetLabel = 'Atelier libre'
  if (claimed.event_id) {
    const { data: event } = await db.from('events').select('title, starts_at').eq('id', claimed.event_id).maybeSingle()
    if (event) targetLabel = `${event.title} · ${new Date(event.starts_at).toLocaleDateString('fr-FR')}`
  } else if (claimed.session_instance_id) {
    const { data: session } = await db
      .from('session_instances')
      .select('session_date, start_time')
      .eq('id', claimed.session_instance_id)
      .maybeSingle()
    if (session) targetLabel = `Atelier libre · ${session.session_date} ${session.start_time.slice(0, 5)}`
  }

  const toTara = reservationAlertForTara({
    customerName: claimed.customer_name,
    partySize: claimed.party_size,
    targetLabel,
    customerEmail: claimed.customer_email,
    customerPhone: claimed.customer_phone,
  })
  const toCustomer = reservationConfirmationForCustomer({ customerName: claimed.customer_name, targetLabel })

  const results = await Promise.allSettled([
    sendTransactionalEmail({ to: { email: env.BREVO_SENDER_EMAIL }, subject: toTara.subject, html: toTara.html }),
    sendTransactionalEmail({
      to: { email: claimed.customer_email, name: claimed.customer_name },
      subject: toCustomer.subject,
      html: toCustomer.html,
    }),
  ])
  logFailures(results, 'reservation')
}

async function handleNewsletter(db: Db, id: string) {
  const { data: claimed } = await db
    .from('newsletter_subscribers')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id, email, confirm_token')
    .maybeSingle()
  if (!claimed) return

  const confirmUrl = `${ADMIN_URL}/newsletter/confirm?token=${claimed.confirm_token}`
  const { subject, html } = newsletterConfirmation({ confirmUrl })
  const results = await Promise.allSettled([sendTransactionalEmail({ to: { email: claimed.email }, subject, html })])
  logFailures(results, 'newsletter')
}

async function handleRequest(db: Db, id: string) {
  const { data: claimed } = await db
    .from('requests')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id, request_type, name, email, phone, message, party_size, desired_date, event_type')
    .maybeSingle()
  if (!claimed) return

  const toTara = requestAlertForTara({
    requestType: claimed.request_type,
    name: claimed.name,
    email: claimed.email,
    phone: claimed.phone,
    message: claimed.message ?? '',
    partySize: claimed.party_size,
    desiredDate: claimed.desired_date,
    eventType: claimed.event_type,
  })
  const toCustomer = requestConfirmationForCustomer({ name: claimed.name, requestType: claimed.request_type })

  const results = await Promise.allSettled([
    sendTransactionalEmail({ to: { email: env.BREVO_SENDER_EMAIL }, subject: toTara.subject, html: toTara.html }),
    sendTransactionalEmail({ to: { email: claimed.email, name: claimed.name }, subject: toCustomer.subject, html: toCustomer.html }),
  ])
  logFailures(results, 'request')
}

export async function webhookHandler(request: Request): Promise<Response> {
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== env.BREVO_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload: unknown = await request.json().catch(() => null)
  if (!isWebhookPayload(payload)) {
    return new Response('Bad request', { status: 400 })
  }

  const db = supabaseAdmin()
  if (payload.type === 'reservation') await handleReservation(db, payload.id)
  else if (payload.type === 'newsletter') await handleNewsletter(db, payload.id)
  else await handleRequest(db, payload.id)

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
}

export const Route = createFileRoute('/api/webhooks/brevo')({
  server: { handlers: { POST: ({ request }) => webhookHandler(request) } },
})
