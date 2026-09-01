// @vitest-environment node

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  // ponytail: le brief de la Tâche 4 omettait ces trois stubs BREVO_*, mais src/env.ts valide
  // TOUTES les variables serveur au chargement (Functions non filtrées par module importateur) —
  // sans elles, `import '@/env'` lève systématiquement. Alignement sur le même correctif déjà
  // appliqué dans api.reservations.checkout.test.ts (Tâche 3).
  vi.stubEnv('BREVO_API_KEY', 'k')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('BREVO_WEBHOOK_SECRET', 'le-vrai-secret-0123456789')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
  vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_x')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.doUnmock('@/lib/supabase/admin')
  vi.doUnmock('@/lib/stripe/client')
})

function request(body: string, signature?: string) {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {},
    body,
  })
}

test('401 sans en-tête de signature', async () => {
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}'))
  expect(res.status).toBe(401)
})

test('400 si la signature ne vérifie pas', async () => {
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({
      webhooks: {
        constructEvent: () => {
          throw new Error('signature invalide')
        },
      },
    }),
  }))
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}', 'sig-bidon'))
  expect(res.status).toBe(400)
})

test('checkout.session.completed : appelle confirm_reservation_payment puis 200', async () => {
  const rpcMock = vi.fn().mockResolvedValue({ data: 'resa-1', error: null })
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ rpc: rpcMock }) }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({
      webhooks: {
        constructEvent: () => ({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_1',
              payment_intent: 'pi_1',
              amount_total: 1200,
              metadata: {
                mode: 'atelier',
                sessionInstanceId: '11111111-1111-1111-1111-111111111111',
                eventId: '',
                partySize: '2',
                customerName: 'Alice',
                customerEmail: 'alice@example.com',
                customerPhone: '',
              },
            },
          },
        }),
      },
    }),
  }))
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}', 'sig-ok'))
  expect(res.status).toBe(200)
  expect(rpcMock).toHaveBeenCalledWith(
    'confirm_reservation_payment',
    expect.objectContaining({ p_stripe_checkout_session_id: 'cs_test_1', p_amount_cents: 1200 }),
  )
})

test('capacité prise entre-temps : rembourse automatiquement', async () => {
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Capacité dépassée' } })
  const refundMock = vi.fn().mockResolvedValue({})
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ rpc: rpcMock }) }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({
      webhooks: {
        constructEvent: () => ({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_2',
              payment_intent: 'pi_2',
              amount_total: 1200,
              metadata: {
                mode: 'atelier',
                sessionInstanceId: '11111111-1111-1111-1111-111111111111',
                eventId: '',
                partySize: '2',
                customerName: 'Bob',
                customerEmail: 'bob@example.com',
                customerPhone: '',
              },
            },
          },
        }),
      },
      refunds: { create: refundMock },
    }),
  }))
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}', 'sig-ok'))
  expect(res.status).toBe(200)
  expect(refundMock).toHaveBeenCalledWith({ payment_intent: 'pi_2' })
})
