import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    BREVO_API_KEY: z.string().min(1),
    BREVO_SENDER_EMAIL: z.string().email(),
    BREVO_WEBHOOK_SECRET: z.string().min(16),
    BREVO_NEWSLETTER_LIST_ID: z.string().min(1).optional(),
  },
  clientPrefix: 'VITE_',
  client: {
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
