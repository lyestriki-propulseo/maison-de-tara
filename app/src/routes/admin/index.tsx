import { createFileRoute } from '@tanstack/react-router'
import { getDashboardStats } from '@/lib/admin-data'

export const Route = createFileRoute('/admin/')({
  loader: () => getDashboardStats(),
  component: Dashboard,
})

const CARDS = [
  { key: 'reservations', label: 'Réservations' },
  { key: 'upcomingSessions', label: 'Sessions à venir' },
  { key: 'subscribers', label: 'Abonnés newsletter' },
  { key: 'newRequests', label: 'Demandes en attente' },
] as const

function Dashboard() {
  const stats = Route.useLoaderData()
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-[#4A5D2E]">Maison de Tara</p>
      <h1 className="mt-1 text-2xl font-light text-[#1A1815]">Tableau de bord</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CARDS.map((card) => (
          <div key={card.key} className="border border-[#4A5D2E]/25 bg-[#F4EDE0]/50 p-5">
            <p className="text-4xl font-light text-[#4A5D2E]">{stats[card.key]}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-neutral-500">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-neutral-500">
        Données lues en direct depuis Supabase. Les prochains écrans (agenda, réservations, bons
        cadeaux…) viendront se brancher ici.
      </p>
    </div>
  )
}
