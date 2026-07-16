import { redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth'

export async function requireSession() {
  // DEV UNIQUEMENT : accès direct à l'admin sans login tant qu'aucun compte n'est créé.
  // Vite fige MODE='production' au build ; le contournement ne peut donc pas fonctionner en prod.
  if (import.meta.env.MODE === 'development') return null
  const session = await getSession()
  if (!session) throw redirect({ to: '/login' })
  return session
}
