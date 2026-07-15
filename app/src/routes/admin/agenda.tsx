import { createFileRoute } from '@tanstack/react-router'
import { getUpcomingSessions } from '@/lib/admin-data'

export const Route = createFileRoute('/admin/agenda')({
  loader: () => getUpcomingSessions(),
  component: Agenda,
})

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function Agenda() {
  const sessions = Route.useLoaderData()

  if (sessions.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-light text-[#1A1815]">Agenda</h1>
        <p className="mt-6 max-w-md text-sm text-neutral-500">
          Aucun créneau planifié pour le moment. La grille hebdomadaire de l&apos;atelier n&apos;est
          pas encore définie.
        </p>
      </div>
    )
  }

  const byDate = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const arr = byDate.get(s.date) ?? []
    arr.push(s)
    byDate.set(s.date, arr)
  }

  return (
    <div>
      <h1 className="text-2xl font-light text-[#1A1815]">Agenda</h1>
      <div className="mt-6 flex flex-col gap-6">
        {[...byDate.entries()].map(([date, items]) => (
          <section key={date}>
            <h2 className="text-xs uppercase tracking-[0.18em] text-[#4A5D2E]">
              {DAY_FMT.format(new Date(date + 'T00:00:00'))}
            </h2>
            <div className="mt-2 divide-y divide-[#4A5D2E]/15 border border-[#4A5D2E]/15">
              {items.map((s) => {
                const free = s.capacity - s.reserved
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <span className="font-medium text-[#1A1815]">{s.time.slice(0, 5)}</span>
                    <span className="text-sm text-neutral-600">
                      {s.status === 'blocked'
                        ? 'Bloqué'
                        : `${s.reserved}/${s.capacity} · ${free} place${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
