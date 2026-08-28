// @vitest-environment node

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const originalFetch = global.fetch

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  global.fetch = originalFetch
  vi.unstubAllEnvs()
})

test('sendTransactionalEmail appelle /v3/smtp/email avec la bonne charge utile', async () => {
  vi.stubEnv('BREVO_API_KEY', 'test-key')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('BREVO_WEBHOOK_SECRET', 'test-secret-1234567890')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
  global.fetch = fetchMock as unknown as typeof fetch

  const { sendTransactionalEmail } = await import('./client')
  await sendTransactionalEmail({ to: { email: 'client@example.com', name: 'Client' }, subject: 'Sujet', html: '<p>Corps</p>' })

  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.brevo.com/v3/smtp/email',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'api-key': 'test-key' }),
    }),
  )
  const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)
  expect(body).toEqual({
    sender: { name: 'Maison de Tara', email: 'contact@maisondetara.com' },
    to: [{ email: 'client@example.com', name: 'Client' }],
    subject: 'Sujet',
    htmlContent: '<p>Corps</p>',
  })
})

test('sendTransactionalEmail lève BrevoError si Brevo refuse', async () => {
  vi.stubEnv('BREVO_API_KEY', 'test-key')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('BREVO_WEBHOOK_SECRET', 'test-secret-1234567890')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
  global.fetch = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 })) as unknown as typeof fetch

  const { sendTransactionalEmail, BrevoError } = await import('./client')
  await expect(
    sendTransactionalEmail({ to: { email: 'a@example.com' }, subject: 's', html: 'h' }),
  ).rejects.toBeInstanceOf(BrevoError)
})

test('addContactToList ne fait rien si BREVO_NEWSLETTER_LIST_ID est absent', async () => {
  vi.stubEnv('BREVO_API_KEY', 'test-key')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('BREVO_WEBHOOK_SECRET', 'test-secret-1234567890')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
  const fetchMock = vi.fn()
  global.fetch = fetchMock as unknown as typeof fetch

  const { addContactToList } = await import('./client')
  await addContactToList('client@example.com')

  expect(fetchMock).not.toHaveBeenCalled()
})
