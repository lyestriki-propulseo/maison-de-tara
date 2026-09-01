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

function request(body: unknown) {
  return new Request('http://localhost/api/reservations/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
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
  const createMock = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' })
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) }),
  }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({ checkout: { sessions: { create: createMock } } }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.url).toBe('https://checkout.stripe.com/test-session')
  expect(createMock).toHaveBeenCalledTimes(1)
  expect(createMock.mock.calls[0]?.[0].line_items[0].price_data.unit_amount).toBe(1200)
  expect(createMock.mock.calls[0]?.[0].payment_method_types).toEqual(['card'])
})

test('événement avec acompte désactivé : pas de Stripe, réservation confirmée directement', async () => {
  const rpcMock = vi.fn((name: string) => {
    if (name === 'check_availability') return Promise.resolve({ data: true, error: null })
    if (name === 'confirm_reservation_payment') return Promise.resolve({ data: 'resa-1', error: null })
    return Promise.resolve({ data: null, error: null })
  })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { title: 'Brunch', deposit_enabled: false, deposit_amount_cents: null },
      error: null,
    }),
  }
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: rpcMock, from: () => chain }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(
    request({ ...validBody, mode: 'evenement', targetId: '22222222-2222-4222-8222-222222222222' }),
  )
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.url).toContain('confirmation-reservation.html')
  expect(rpcMock).toHaveBeenCalledWith('confirm_reservation_payment', expect.objectContaining({ p_amount_cents: 0 }))
})

test('événement avec acompte désactivé : erreur métier de confirm_reservation_payment → 400 générique (pas le message Postgres brut)', async () => {
  const rpcMock = vi.fn((name: string) => {
    if (name === 'check_availability') return Promise.resolve({ data: true, error: null })
    if (name === 'confirm_reservation_payment')
      return Promise.resolve({
        data: null,
        error: { message: 'Une réservation a déjà été enregistrée avec cet email il y a moins de 5 minutes. Merci de patienter avant de réessayer.' },
      })
    return Promise.resolve({ data: null, error: null })
  })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { title: 'Brunch', deposit_enabled: false, deposit_amount_cents: null },
      error: null,
    }),
  }
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: rpcMock, from: () => chain }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(
    request({ ...validBody, mode: 'evenement', targetId: '22222222-2222-4222-8222-222222222222' }),
  )
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.message).toBe('Impossible de confirmer la réservation. Merci de réessayer ou de contacter Tara.')
})
