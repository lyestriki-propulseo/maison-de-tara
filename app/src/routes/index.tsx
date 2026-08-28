import { createFileRoute, redirect } from '@tanstack/react-router'

// La racine n'a pas de page propre : l'app EST le back-office. On envoie sur
// /admin, qui redirige lui-même vers /login si aucune session, ou affiche le
// tableau de bord si l'admin est connectée.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin' })
  },
})
