import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  component: () => <h1 className="text-2xl">Tableau de bord</h1>,
})
