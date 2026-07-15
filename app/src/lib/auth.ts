import type { Session } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase/browser'

export async function signIn(
  email: string,
  password: string,
): Promise<{ session: Session | null; error: string | null }> {
  const { data, error } = await supabaseBrowser().auth.signInWithPassword({ email, password })
  return { session: data.session, error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  await supabaseBrowser().auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabaseBrowser().auth.getSession()
  return data.session
}
