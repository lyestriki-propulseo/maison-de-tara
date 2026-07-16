import { ArrowRight, CalendarDays, Inbox, Mail, Users } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getDashboardStats } from '@/lib/admin-data'

export const Route = createFileRoute('/admin/')({
  loader: () => getDashboardStats(),
  component: Dashboard,
})

const LEDGER = [
  { key: 'reservations', label: 'Réservations', icon: Users },
  { key: 'upcomingSessions', label: 'Sessions à venir', icon: CalendarDays },
  { key: 'subscribers', label: 'Abonnés newsletter', icon: Mail },
] as const

function Dashboard() {
  const stats = Route.useLoaderData()
  return (
    <div className="tara-admin-page tara-dashboard">
      <header className="tara-page-heading">
        <div>
          <p>Maison de Tara</p>
          <h1>Tableau de bord</h1>
          <span>Une vue claire de l’activité de l’atelier.</span>
        </div>
        <Link to="/admin/agenda" className="tara-primary-action">
          Ouvrir l’agenda <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <div className="tara-dashboard__layout">
        <section className="tara-dashboard__priority" aria-labelledby="priority-title">
          <div className="tara-dashboard__priority-icon" aria-hidden="true"><Inbox size={20} /></div>
          <p>À traiter</p>
          <strong>{stats.newRequests}</strong>
          <h2 id="priority-title">Demande{stats.newRequests > 1 ? 's' : ''} en attente</h2>
          <span>
            {stats.newRequests === 0
              ? 'Tout est à jour pour le moment.'
              : 'Ces demandes nécessitent une réponse de votre part.'}
          </span>
        </section>

        <section className="tara-dashboard__ledger" aria-labelledby="activity-title">
          <div className="tara-dashboard__ledger-heading">
            <div>
              <p>Aujourd’hui</p>
              <h2 id="activity-title">Activité de la maison</h2>
            </div>
            <span>Données en direct</span>
          </div>
          <dl>
            {LEDGER.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.key}>
                  <dt><Icon size={17} aria-hidden="true" /> {item.label}</dt>
                  <dd>{stats[item.key]}</dd>
                </div>
              )
            })}
          </dl>
        </section>
      </div>
    </div>
  )
}
