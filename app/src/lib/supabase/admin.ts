import { createClient } from '@supabase/supabase-js'
import type { DatabaseWithRpc } from '@/types/database-rpc.types'
import { env } from '@/env'

export function supabaseAdmin() {
  return createClient<DatabaseWithRpc>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
