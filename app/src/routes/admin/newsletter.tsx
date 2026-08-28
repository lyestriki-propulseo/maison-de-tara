import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listNewsletterSubscribers } from '@/lib/newsletter-data'

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente de confirmation',
  confirmed: 'Confirmé',
  unsubscribed: 'Désabonné',
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export const Route = createFileRoute('/admin/newsletter')({
  loader: () => listNewsletterSubscribers(),
  component: NewsletterPage,
})

type SubscriberRow = Awaited<ReturnType<typeof listNewsletterSubscribers>>[number]

function NewsletterPage() {
  const subscribers = Route.useLoaderData()
  const [filter, setFilter] = useState<string>('confirmed')

  const visible = filter === 'all' ? subscribers : subscribers.filter((s) => s.status === filter)
  const counts = {
    all: subscribers.length,
    pending: subscribers.filter((s) => s.status === 'pending').length,
    confirmed: subscribers.filter((s) => s.status === 'confirmed').length,
    unsubscribed: subscribers.filter((s) => s.status === 'unsubscribed').length,
  }

  return (
    <div className="tara-admin-page">
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Le suivi</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">Newsletter</h1>
          <p className="tara-page-intro">Les personnes inscrites à la lettre de la maison, pour les contacter au besoin.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterTab active={filter === 'confirmed'} onClick={() => setFilter('confirmed')}>
          Confirmés ({counts.confirmed})
        </FilterTab>
        <FilterTab active={filter === 'pending'} onClick={() => setFilter('pending')}>
          En attente ({counts.pending})
        </FilterTab>
        <FilterTab active={filter === 'unsubscribed'} onClick={() => setFilter('unsubscribed')}>
          Désabonnés ({counts.unsubscribed})
        </FilterTab>
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
          Tous ({counts.all})
        </FilterTab>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-600">Aucun inscrit pour ce filtre.</p>
        ) : (
          <ul className="divide-y divide-[#4A5D2E]/12">
            {visible.map((s: SubscriberRow) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#1A1815]">{s.email}</p>
                  <p className="text-xs text-neutral-500">
                    Inscrit le {DATE_FMT.format(new Date(s.createdAt))}
                    {s.confirmedAt ? ` · confirmé le ${DATE_FMT.format(new Date(s.confirmedAt))}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-[#E4ECD8] px-2.5 py-0.5 text-xs font-semibold text-[#31421E]">
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
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
