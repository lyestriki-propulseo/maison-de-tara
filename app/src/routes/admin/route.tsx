import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getSession } from '@/lib/auth'

export async function requireSession() {
  // ⚠️ DEV UNIQUEMENT : accès direct à l'admin sans login (pas encore de compte créé).
  // Actif seulement avec `pnpm dev` (MODE='development'). Vite fige MODE='production' au
  // build → AUCUN contournement en prod. Sous Vitest, MODE='test' → la garde reste testée.
  if (import.meta.env.MODE === 'development') return null
  const session = await getSession()
  if (!session) throw redirect({ to: '/login' })
  return session
}

export const Route = createFileRoute('/admin')({
  ssr: false,
  beforeLoad: () => requireSession(),
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r p-4">
        <p className="font-semibold">Maison de Tara</p>
        <nav className="mt-4 flex flex-col gap-2 text-sm">
          <a href="/admin">Tableau de bord</a>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
