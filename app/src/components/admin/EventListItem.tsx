import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { eventTypeLabel, formatDuration, formatPricePerPerson } from '@/lib/events'

// Une ligne de la liste du Programme (/admin/programme). Un événement privé (US-004) affiche un
// badge « Privé » à la place du prix et des places, qu'il n'a pas.

export type EventListRow = {
  id: string
  title: string
  eventType: string
  startsAt: string
  endsAt: string | null
  capacity: number
  priceCents: number
  isPrivate: boolean
  published: boolean
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function EventListItem({
  ev,
  pending,
  onTogglePublish,
  onEdit,
  onRemove,
}: {
  ev: EventListRow
  pending: boolean
  onTogglePublish: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const duree = ev.endsAt ? formatDuration(ev.startsAt, ev.endsAt) : 'Fin à définir'
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#E4ECD8] px-2.5 py-0.5 text-xs font-semibold text-[#31421E]">
            {eventTypeLabel(ev.eventType)}
          </span>
          {ev.isPrivate ? (
            <span className="rounded-full bg-[#2C2419] px-2.5 py-0.5 text-xs font-semibold text-white">
              Privé
            </span>
          ) : null}
          {ev.published ? (
            <span className="text-xs font-medium text-[#4A5D2E]">● Publié</span>
          ) : (
            <span className="text-xs font-medium text-neutral-400">○ Brouillon</span>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-[#1A1815]">{ev.title}</p>
        <p className="text-xs capitalize text-neutral-500">
          {DATE_FMT.format(new Date(ev.startsAt))}
          {ev.isPrivate ? '' : ` · ${ev.capacity} places`}
        </p>
        <p className="text-xs text-neutral-500">
          {ev.isPrivate
            ? 'Sur invitation, salle privatisée'
            : ev.priceCents > 0
              ? formatPricePerPerson(ev.priceCents)
              : 'Prix à définir'}
          {' · '}
          {duree}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <IconButton label={ev.published ? 'Dépublier' : 'Publier'} onClick={onTogglePublish} disabled={pending}>
          {ev.published ? <EyeOff size={16} /> : <Eye size={16} />}
        </IconButton>
        <IconButton label="Modifier" onClick={onEdit} disabled={pending}>
          <Pencil size={16} />
        </IconButton>
        <IconButton label="Supprimer" danger onClick={onRemove} disabled={pending}>
          <Trash2 size={16} />
        </IconButton>
      </div>
    </li>
  )
}

function IconButton({
  label,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  label: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
        danger
          ? 'text-neutral-500 hover:bg-red-50 hover:text-red-700'
          : 'text-neutral-600 hover:bg-[#4A5D2E]/8 hover:text-[#4A5D2E]'
      }`}
    >
      {children}
    </button>
  )
}
