import { createFileRoute, redirect, Outlet, Link } from '@tanstack/react-router'
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
      <aside className="w-56 border-r border-[#4A5D2E]/15 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#4A5D2E]">Maison de Tara</p>
        <nav className="mt-6 flex flex-col gap-1 text-sm">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            className="rounded px-2 py-1.5 text-neutral-700 transition-colors hover:bg-[#4A5D2E]/10 hover:text-[#4A5D2E]"
            activeProps={{
              className: 'rounded px-2 py-1.5 bg-[#4A5D2E]/10 font-medium text-[#4A5D2E]',
            }}
          >
            Tableau de bord
          </Link>
          <Link
            to="/admin/agenda"
            className="rounded px-2 py-1.5 text-neutral-700 transition-colors hover:bg-[#4A5D2E]/10 hover:text-[#4A5D2E]"
            activeProps={{
              className: 'rounded px-2 py-1.5 bg-[#4A5D2E]/10 font-medium text-[#4A5D2E]',
            }}
          >
            Agenda
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
