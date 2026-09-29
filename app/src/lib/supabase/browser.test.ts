import { expect, test, vi } from 'vitest'

test('crée un client supabase navigateur', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  const { supabaseBrowser } = await import('@/lib/supabase/browser')
  const client = supabaseBrowser()
  expect(client).toHaveProperty('auth')
  expect(client).toHaveProperty('from')
})

// Un client par appel = plusieurs GoTrueClient qui se disputent le renouvellement du jeton :
// le perdant voit une session nulle et l'admin affiche « Non authentifié. » (retour Tara 28/09).
test('renvoie toujours le même client (une seule session partagée)', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  const { supabaseBrowser } = await import('@/lib/supabase/browser')
  expect(supabaseBrowser()).toBe(supabaseBrowser())
})
