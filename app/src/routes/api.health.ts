import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'

export async function healthHandler() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/health')({
  server: { handlers: { GET: () => healthHandler() } },
})
