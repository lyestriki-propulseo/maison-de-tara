import { expect, test, vi } from 'vitest'

test('crée un client supabase navigateur', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  const { supabaseBrowser } = await import('@/lib/supabase/browser')
  const client = supabaseBrowser()
  expect(client).toHaveProperty('auth')
  expect(client).toHaveProperty('from')
})
