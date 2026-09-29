import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Un seul client pour tout le navigateur. En créer un par appel multipliait les GoTrueClient :
// ils se disputaient le renouvellement du jeton, le perdant renvoyait une session nulle et les
// actions de l'admin échouaient en « Non authentifié. » (retour Tara 28/09).
let client: SupabaseClient<Database> | undefined

export function supabaseBrowser() {
  client ??= createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  return client
}
