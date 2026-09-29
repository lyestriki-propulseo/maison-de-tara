import { Link } from '@tanstack/react-router'

// Onglets de la rubrique « Réservations » : tout ce qui touche aux venues de la maison au même
// endroit (demande Lyes 29/09 : Agenda, Programme et Réservations étaient trois menus séparés).
export const RESERVATION_PATHS = [
  '/admin/agenda',
  '/admin/programme',
  '/admin/reservations',
  '/admin/reglages',
] as const

const TABS = [
  { to: '/admin/agenda', label: 'Planning' },
  { to: '/admin/programme', label: 'Événements' },
  { to: '/admin/reservations', label: 'Réservations' },
  { to: '/admin/reglages', label: 'Réglages' },
] as const

export function ReservationsTabs() {
  return (
    <nav aria-label="Rubrique Réservations" className="mb-6 flex flex-wrap gap-2 border-b border-[#4A5D2E]/15 pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-neutral-600 transition-colors hover:bg-[#4A5D2E]/8 hover:text-[#4A5D2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
          activeProps={{
            className: 'bg-[#4A5D2E] text-white hover:bg-[#3B4B24] hover:text-white',
            'aria-current': 'page',
          }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
