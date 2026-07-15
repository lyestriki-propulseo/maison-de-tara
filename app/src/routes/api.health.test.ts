import { expect, test } from 'vitest'
import { healthHandler } from '@/routes/api.health'

test('health renvoie ok:true', async () => {
  const res = await healthHandler()
  expect(await res.json()).toEqual({ ok: true })
})
