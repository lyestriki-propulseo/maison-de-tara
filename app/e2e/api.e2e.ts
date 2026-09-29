import { expect, test } from '@playwright/test'

// Routes API : refus attendus uniquement (aucune session Stripe créée, aucun e-mail envoyé).
test.use({ storageState: { cookies: [], origins: [] } })

test('le service répond (santé)', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

test('le paiement refuse une demande invalide', async ({ request }) => {
  const res = await request.post('/api/reservations/checkout', { data: { mode: 'atelier' } })
  expect(res.status()).toBe(400)
})

test('le paiement refuse un créneau inexistant', async ({ request }) => {
  const res = await request.post('/api/reservations/checkout', {
    data: {
      mode: 'atelier',
      targetId: '00000000-0000-4000-8000-000000000000',
      partySize: 1,
      customerName: 'E2E',
      customerEmail: 'e2e+api@example.com',
    },
  })
  expect(res.status()).toBe(409)
})

test('les webhooks refusent un appel non signé', async ({ request }) => {
  expect((await request.post('/api/webhooks/stripe', { data: {} })).status()).toBe(401)
  expect((await request.post('/api/webhooks/brevo', { data: {} })).status()).toBe(401)
})
