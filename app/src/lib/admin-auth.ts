import { redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth'

export async function requireSession() {
  const session = await getSession()
  if (!session) throw redirect({ to: '/login' })
  return session
}
