import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export function supabaseBrowser() {
  return createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}
