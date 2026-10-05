// @vitest-environment node

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
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

function request(body: unknown, origin?: string) {
  return new Request('http://localhost/api/reservations/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: origin ? { Origin: origin } : {},
  })
}

// Réglage « acompte atelier » lu dans site_settings (null = jamais réglé → 6 € par défaut).
function settingsTable(value: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: value === null ? null : { value }, error: null }),
  }
}

function mockStripeOk() {
  const createMock = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' })
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: () => settingsTable(),
    }),
  }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({ checkout: { sessions: { create: createMock } } }),
  }))
  return createMock
}

const validBody = {
  mode: 'atelier' as const,
  targetId: '11111111-1111-4111-8111-111111111111',
  partySize: 2,
  customerName: 'Alice',
  customerEmail: 'alice@example.com',
}

test('400 sur un body invalide', async () => {
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request({ mode: 'atelier' }))
  expect(res.status).toBe(400)
})

test('409 si plus de disponibilité', async () => {
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: vi.fn().mockResolvedValue({ data: false, error: null }) }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody))
  expect(res.status).toBe(409)
})

test('200 et url Stripe si disponible (atelier, 6€/pers)', async () => {
  const createMock = mockStripeOk()
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.url).toBe('https://checkout.stripe.com/test-session')
  expect(createMock).toHaveBeenCalledTimes(1)
  expect(createMock.mock.calls[0]?.[0].line_items[0].price_data.unit_amount).toBe(1200)
  expect(createMock.mock.calls[0]?.[0].payment_method_types).toEqual(['card'])
})

test('atelier : applique l’acompte réglé par Tara dans l’admin (8 €/pers)', async () => {
  const createMock = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' })
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: () => settingsTable({ cents: 800 }),
    }),
  }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({ checkout: { sessions: { create: createMock } } }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody))
  expect(res.status).toBe(200)
  expect(createMock.mock.calls[0]?.[0].line_items[0].price_data.unit_amount).toBe(1600)
})

test('atelier à 0 € : pas de Stripe, réservation confirmée directement', async () => {
  const rpcMock = vi.fn((name: string) =>
    Promise.resolve(
      name === 'confirm_reservation_payment'
        ? { data: 'resa-2', error: null }
        : { data: true, error: null },
    ),
  )
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: rpcMock, from: () => settingsTable({ cents: 0 }) }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody))
  expect(res.status).toBe(200)
  expect((await res.json()).url).toContain('confirmation-reservation')
  expect(rpcMock).toHaveBeenCalledWith('confirm_reservation_payment', expect.objectContaining({ p_amount_cents: 0 }))
})

const eventId = '22222222-2222-4222-8222-222222222222'

// Événement lu dans `events` + Stripe simulé. `confirmRpc` ne doit jamais servir pour un événement.
function mockEvent(event: { title: string; deposit_enabled: boolean; deposit_amount_cents: number | null }) {
  const stripeCreate = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' })
  const confirmRpc = vi.fn().mockResolvedValue({ data: 'resa-1', error: null })
  const rpc = vi.fn((name: string) =>
    name === 'confirm_reservation_payment' ? confirmRpc() : Promise.resolve({ data: true, error: null }),
  )
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: event, error: null }),
  }
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ rpc, from: () => chain }) }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({ checkout: { sessions: { create: stripeCreate } } }),
  }))
  return { stripeCreate, confirmRpc }
}

async function postEvent(partySize: number) {
  const { checkoutHandler } = await import('./api.reservations.checkout')
  return checkoutHandler(request({ ...validBody, mode: 'evenement', targetId: eventId, partySize }))
}

test('facture le prix complet par personne pour un événement', async () => {
  const { stripeCreate } = mockEvent({ title: 'Soirée', deposit_enabled: true, deposit_amount_cents: 4500 })
  const res = await postEvent(2)
  expect(res.status).toBe(200)
  expect(stripeCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      line_items: [
        expect.objectContaining({
          quantity: 1,
          price_data: expect.objectContaining({ unit_amount: 9000, product_data: { name: 'Soirée — 2 pers.' } }),
        }),
      ],
    }),
  )
})

test('refuse un événement sans prix au lieu de le confirmer gratuitement', async () => {
  const { stripeCreate, confirmRpc } = mockEvent({ title: 'Soirée', deposit_enabled: false, deposit_amount_cents: null })
  const res = await postEvent(2)
  expect(res.status).toBe(409)
  expect((await res.json()).message).toBe('Cet événement n’est pas encore ouvert à la réservation.')
  expect(confirmRpc).not.toHaveBeenCalled()
  expect(stripeCreate).not.toHaveBeenCalled()
})

test('refuse un événement à moins de 1 € (ancien acompte à 0)', async () => {
  const { confirmRpc } = mockEvent({ title: 'Soirée', deposit_enabled: true, deposit_amount_cents: 0 })
  const res = await postEvent(1)
  expect(res.status).toBe(409)
  expect(confirmRpc).not.toHaveBeenCalled()
})

test('garde l’événement présélectionné si le paiement est annulé', async () => {
  const { stripeCreate } = mockEvent({ title: 'Soirée', deposit_enabled: true, deposit_amount_cents: 4500 })
  await postEvent(1)
  expect(stripeCreate.mock.calls[0]?.[0].cancel_url).toContain(`event=${eventId}`)
})

test('atelier : libellé Stripe « Acompte atelier — N pers. »', async () => {
  const createMock = mockStripeOk()
  const { checkoutHandler } = await import('./api.reservations.checkout')
  await checkoutHandler(request(validBody))
  expect(createMock.mock.calls[0]?.[0].line_items[0].price_data.product_data.name).toBe('Acompte atelier — 2 pers.')
})

test('Stripe en panne : 502 JSON avec les en-têtes CORS', async () => {
  const { stripeCreate } = mockEvent({ title: 'Soirée', deposit_enabled: true, deposit_amount_cents: 4500 })
  stripeCreate.mockRejectedValueOnce(new Error('Stripe down'))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(
    request({ ...validBody, mode: 'evenement', targetId: eventId }, 'https://www.maisondetara.com'),
  )
  expect(res.status).toBe(502)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://www.maisondetara.com')
  expect(typeof (await res.json()).message).toBe('string')
})

test.each(['https://maisondetara.com', 'https://www.maisondetara.com', 'https://maisondetara.propulseo-site.com'])(
  'domaine du site %s accepté : CORS et retours Stripe restent sur ce domaine',
  async (origin) => {
    const createMock = mockStripeOk()
    const { checkoutHandler } = await import('./api.reservations.checkout')
    const res = await checkoutHandler(request(validBody, origin))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    const params = createMock.mock.calls[0]?.[0]
    expect(params.success_url).toBe(`${origin}/confirmation-reservation?session_id={CHECKOUT_SESSION_ID}`)
    expect(params.cancel_url).toBe(`${origin}/atelier?paiement=annule#reserver`)
  },
)

test('domaine inconnu ou absent : CORS et retours retombent sur maisondetara.com', async () => {
  const createMock = mockStripeOk()
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody, 'https://evil.example'))
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://maisondetara.com')
  expect(createMock.mock.calls[0]?.[0].success_url).toMatch(/^https:\/\/maisondetara\.com\//)
})
