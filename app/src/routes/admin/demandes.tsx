import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listRequests } from '@/lib/requests-data'
import { eventTypeLabel } from '@/lib/events'

const STATUS_LABEL: Record<string, string> = {
  nouvelle: 'Nouvelle',
  en_cours: 'En cours',
  traitee: 'Traitée',
  devis_envoye: 'Devis envoyé',
}

const REQUEST_TYPE_LABEL: Record<string, string> = {
  contact: 'Contact',
  privatisation: 'Privatisation',
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const DESIRED_DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export const Route = createFileRoute('/admin/demandes')({
  loader: () => listRequests(),
  component: DemandesPage,
})

type RequestRow = Awaited<ReturnType<typeof listRequests>>[number]

function DemandesPage() {
  const requests = Route.useLoaderData()
  const [filter, setFilter] = useState<string>('nouvelle')

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter)
  const counts = {
    all: requests.length,
    nouvelle: requests.filter((r) => r.status === 'nouvelle').length,
    en_cours: requests.filter((r) => r.status === 'en_cours').length,
    traitee: requests.filter((r) => r.status === 'traitee').length,
    devis_envoye: requests.filter((r) => r.status === 'devis_envoye').length,
  }

  return (
    <div className="tara-admin-page">
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Le suivi</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">Demandes</h1>
          <p className="tara-page-intro">Les messages de contact et demandes de privatisation reçus depuis le site.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterTab active={filter === 'nouvelle'} onClick={() => setFilter('nouvelle')}>
          Nouvelles ({counts.nouvelle})
        </FilterTab>
        <FilterTab active={filter === 'en_cours'} onClick={() => setFilter('en_cours')}>
          En cours ({counts.en_cours})
        </FilterTab>
        <FilterTab active={filter === 'traitee'} onClick={() => setFilter('traitee')}>
          Traitées ({counts.traitee})
        </FilterTab>
        <FilterTab active={filter === 'devis_envoye'} onClick={() => setFilter('devis_envoye')}>
          Devis envoyés ({counts.devis_envoye})
        </FilterTab>
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
          Toutes ({counts.all})
        </FilterTab>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-600">Aucune demande pour ce filtre.</p>
        ) : (
          <ul className="divide-y divide-[#4A5D2E]/12">
            {visible.map((r: RequestRow) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#E4ECD8] px-2.5 py-0.5 text-xs font-semibold text-[#31421E]">
                    {REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}
                  </span>
                  <span className="text-xs font-medium text-neutral-400">{STATUS_LABEL[r.status] ?? r.status}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[#1A1815]">{r.name}</p>
                <p className="text-xs text-neutral-500">
                  {r.email}
                  {r.phone ? ` · ${r.phone}` : ''}
                </p>
                {r.message ? <p className="mt-2 line-clamp-2 text-sm text-neutral-700">{r.message}</p> : null}
                {r.partySize != null || r.desiredDate || r.eventType ? (
                  <p className="mt-2 text-xs text-neutral-500">
                    {r.partySize != null ? `${r.partySize} pers.` : ''}
                    {r.desiredDate ? ` · ${DESIRED_DATE_FMT.format(new Date(r.desiredDate))}` : ''}
                    {r.eventType ? ` · ${eventTypeLabel(r.eventType)}` : ''}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-neutral-400">Reçue le {DATE_FMT.format(new Date(r.createdAt))}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
        active ? 'bg-[#4A5D2E] text-white' : 'bg-[#4A5D2E]/8 text-[#31421E] hover:bg-[#4A5D2E]/15'
      }`}
    >
      {children}
    </button>
  )
}
