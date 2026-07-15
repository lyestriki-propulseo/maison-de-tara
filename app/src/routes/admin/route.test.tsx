import { expect, test, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn().mockResolvedValue(null) }))

test('la garde admin lève une redirection vers /login sans session', async () => {
  const { requireSession } = await import('@/routes/admin/route')
  await expect(requireSession()).rejects.toMatchObject({ options: { to: '/login' } })
})
