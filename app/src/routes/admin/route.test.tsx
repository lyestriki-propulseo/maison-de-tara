import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/lib/auth')
})

test('la garde admin lève une redirection vers /login sans session', async () => {
  vi.doMock('@/lib/auth', () => ({ getSession: vi.fn().mockResolvedValue(null) }))
  const { requireSession } = await import('@/lib/admin-auth')
  await expect(requireSession()).rejects.toMatchObject({ options: { to: '/login' } })
})

test('la garde admin résout et renvoie la session quand elle est valide', async () => {
  const session = { access_token: 'x' }
  vi.doMock('@/lib/auth', () => ({ getSession: vi.fn().mockResolvedValue(session) }))
  const { requireSession } = await import('@/lib/admin-auth')
  await expect(requireSession()).resolves.toBe(session)
})
