import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/lib/supabase/browser')
})

test('signIn transmet email et mot de passe à Supabase', async () => {
  vi.doMock('@/lib/supabase/browser', () => {
    const signInWithPassword = vi
      .fn()
      .mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null })
    return { supabaseBrowser: () => ({ auth: { signInWithPassword } }) }
  })
  const { signIn } = await import('@/lib/auth')
  const res = await signIn('tara@example.com', 'secret123')
  expect(res.error).toBeNull()
  expect(res.session?.access_token).toBe('x')
})

test('signIn renvoie une erreur au lieu de laisser remonter une exception réseau', async () => {
  vi.doMock('@/lib/supabase/browser', () => {
    const signInWithPassword = vi.fn().mockRejectedValue(new Error('Network request failed'))
    return { supabaseBrowser: () => ({ auth: { signInWithPassword } }) }
  })
  const { signIn } = await import('@/lib/auth')
  const res = await signIn('tara@example.com', 'secret123')
  expect(res.session).toBeNull()
  expect(res.error).toBe('Network request failed')
})
