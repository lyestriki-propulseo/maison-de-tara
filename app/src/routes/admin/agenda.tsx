import { createFileRoute } from '@tanstack/react-router'
import { getAgendaData } from '@/lib/admin-data'
import { AgendaManager } from '@/components/admin/AgendaManager'

export const Route = createFileRoute('/admin/agenda')({
  loader: () => getAgendaData(),
  component: Agenda,
})

function Agenda() {
  return <AgendaManager data={Route.useLoaderData()} />
}
