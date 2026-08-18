import { CalendarDays, Clock3, Home } from 'lucide-react'
import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { requireSession } from '@/lib/admin-auth'
import taraLogo from '../../assets/mdt_logo_complet_transparent.png?url'
import '../../components/admin/admin-shell.css'

export const Route = createFileRoute('/admin')({
  ssr: false,
  beforeLoad: () => requireSession(),
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="tara-admin-shell">
      <header className="tara-admin-mobile-header">
        <img src={taraLogo} alt="Maison de Tara" />
        <nav aria-label="Navigation admin">
          <AdminLink to="/admin" exact>Accueil</AdminLink>
          <AdminLink to="/admin/agenda">Agenda</AdminLink>
          <AdminLink to="/admin/horaires">Horaires</AdminLink>
        </nav>
      </header>

      <aside className="tara-admin-sidebar">
        <div className="tara-admin-sidebar__brand">
          <img src={taraLogo} alt="Maison de Tara" />
          <p>Espace de gestion</p>
        </div>

        <p className="tara-admin-sidebar__section">Gestion</p>
        <nav aria-label="Navigation admin">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            className="tara-admin-nav-link"
            activeProps={{ className: 'tara-admin-nav-link is-active' }}
          >
            <Home size={17} aria-hidden="true" />
            Accueil
          </Link>
          <Link
            to="/admin/agenda"
            className="tara-admin-nav-link"
            activeProps={{ className: 'tara-admin-nav-link is-active' }}
          >
            <CalendarDays size={17} aria-hidden="true" />
            Agenda
          </Link>
          <Link
            to="/admin/horaires"
            className="tara-admin-nav-link"
            activeProps={{ className: 'tara-admin-nav-link is-active' }}
          >
            <Clock3 size={17} aria-hidden="true" />
            Horaires
          </Link>
        </nav>

        <div className="tara-admin-sidebar__footer">
          <div className="tara-admin-sidebar__avatar" aria-hidden="true">MT</div>
          <div>
            <strong>Maison de Tara</strong>
            <span>Administratrice</span>
          </div>
        </div>
        <p className="tara-admin-sidebar__signature">Prendre le temps.</p>
      </aside>

      <div className="tara-admin-workspace">
        <main className="tara-admin-main"><Outlet /></main>
      </div>
    </div>
  )
}

function AdminLink({
  to,
  exact = false,
  children,
}: {
  to: '/admin' | '/admin/agenda' | '/admin/horaires'
  exact?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="tara-admin-mobile-link"
      activeProps={{ className: 'tara-admin-mobile-link is-active' }}
    >
      {children}
    </Link>
  )
}
