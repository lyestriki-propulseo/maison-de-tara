// @vitest-environment node

import { expect, test } from 'vitest'

test('rejette une SUPABASE_URL manquante', async () => {
  const prev = process.env.SUPABASE_URL
  try {
    delete process.env.SUPABASE_URL
    await expect(import('@/env?bust=' + Date.now())).rejects.toThrow()
  } finally {
    if (prev) process.env.SUPABASE_URL = prev
  }
})
