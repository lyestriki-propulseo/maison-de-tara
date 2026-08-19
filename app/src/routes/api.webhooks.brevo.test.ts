// @vitest-environment node

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('BREVO_API_KEY', 'k')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('BREVO_WEBHOOK_SECRET', 'le-vrai-secret-0123456789')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.doUnmock('@/lib/supabase/admin')
  vi.doUnmock('@/lib/brevo/client')
})

function request(body: unknown, secret?: string) {
  return new Request('http://localhost/api/webhooks/brevo', {
    method: 'POST',
    headers: secret ? { 'x-webhook-secret': secret } : {},
    body: JSON.stringify(body),
  })
}

test('401 sans en-tête secret', async () => {
  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'reservation', id: '1' }))
  expect(res.status).toBe(401)
})

test('401 avec un mauvais secret', async () => {
  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'reservation', id: '1' }, 'faux-secret'))
  expect(res.status).toBe(401)
})

test('400 avec une charge utile invalide', async () => {
  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'inconnu', id: '1' }, 'le-vrai-secret-0123456789'))
  expect(res.status).toBe(400)
})

test('newsletter : claim atomique puis envoi, 200', async () => {
  const sendMock = vi.fn().mockResolvedValue(undefined)
  vi.doMock('@/lib/brevo/client', () => ({
    sendTransactionalEmail: sendMock,
    addContactToList: vi.fn(),
  }))
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { id: 'nl-1', email: 'client@example.com', confirm_token: 'tok-123' },
    error: null,
  })
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle,
  }
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ from: () => chain }) }))

  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'newsletter', id: 'nl-1' }, 'le-vrai-secret-0123456789'))

  expect(res.status).toBe(200)
  expect(sendMock).toHaveBeenCalledTimes(1)
  expect(sendMock.mock.calls[0]?.[0].to.email).toBe('client@example.com')
})

test('newsletter déjà notifiée (claim renvoie null) : aucun envoi, 200', async () => {
  const sendMock = vi.fn()
  vi.doMock('@/lib/brevo/client', () => ({ sendTransactionalEmail: sendMock, addContactToList: vi.fn() }))
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ from: () => chain }) }))

  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'newsletter', id: 'nl-1' }, 'le-vrai-secret-0123456789'))

  expect(res.status).toBe(200)
  expect(sendMock).not.toHaveBeenCalled()
})
