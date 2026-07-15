import { expect, test, vi } from 'vitest'

vi.mock('@/lib/supabase/browser', () => {
  const signInWithPassword = vi
    .fn()
    .mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null })
  return { supabaseBrowser: () => ({ auth: { signInWithPassword } }) }
})

test('signIn transmet email et mot de passe à Supabase', async () => {
  const { signIn } = await import('@/lib/auth')
  const res = await signIn('tara@example.com', 'secret123')
  expect(res.error).toBeNull()
  expect(res.session?.access_token).toBe('x')
})
