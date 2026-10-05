import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteEvent, listEvents, setEventPublished, upsertEvent } from '@/lib/events-data'
import {
  canPublishEvent,
  eventInputSchema,
  eventTypeLabel,
  formatDuration,
  formatPricePerPerson,
} from '@/lib/events'
import { EMPTY_EVENT_FORM, EventForm, priceEurosToCents } from '@/components/admin/EventForm'
import { ReservationsTabs } from '@/components/admin/ReservationsTabs'
import type { EventFormState } from '@/components/admin/EventForm'

export const Route = createFileRoute('/admin/programme')({
  loader: () => listEvents(),
  component: ProgrammePage,
})

type EventRow = Awaited<ReturnType<typeof listEvents>>[number]
type SaveResult = Awaited<ReturnType<typeof upsertEvent>>

// Message de succès complété par l'effet de la privatisation sur l'agenda.
function withPrivatisation(base: string, result: SaveResult): string {
  const { blocked, reopened, reservedConflicts } = result.privatisation
  const parts = [base]
  if (blocked > 0) parts.push(`${blocked} créneau(x) d’atelier bloqué(s) pour la privatisation.`)
  if (reopened > blocked) parts.push(`${reopened - blocked} créneau(x) d’atelier rouvert(s).`)
  if (reservedConflicts > 0) {
    parts.push(
      `Attention : ${reservedConflicts} réservation(s) d’atelier existent déjà pendant l’événement — à gérer dans Réservations.`,
    )
  }
  return parts.join(' ')
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue'
}

// L'input datetime-local donne l'heure locale de Tara. On la convertit en instant UTC pour la base,
// et inversement pour l'édition, afin que l'heure affichée soit toujours celle qu'elle a saisie.
function toIsoUtc(local: string): string {
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? local : d.toISOString()
}
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ProgrammePage() {
  const router = useRouter()
  const events = Route.useLoaderData()
  const [form, setForm] = useState<EventFormState | null>(null)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string }>()

  async function runAction<T>(action: () => Promise<T>, success: string | ((result: T) => string)) {
    setPending(true)
    setFeedback(undefined)
    try {
      const result = await action()
      await router.invalidate()
      setFeedback({ kind: 'success', message: typeof success === 'string' ? success : success(result) })
      return true
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
      return false
    } finally {
      setPending(false)
    }
  }

  function edit(ev: EventRow) {
    setForm({
      id: ev.id,
      title: ev.title,
      eventType: ev.eventType,
      description: ev.description,
      startsAt: toLocalInput(ev.startsAt),
      endsAt: ev.endsAt ? toLocalInput(ev.endsAt) : '',
      capacity: ev.capacity,
      priceEuros: ev.priceCents > 0 ? String(ev.priceCents / 100) : '',
      privatise: ev.privatise,
      published: ev.published,
    })
    setFeedback(undefined)
  }

  async function save() {
    if (!form) return
    const parsed = eventInputSchema.safeParse({
      ...form,
      startsAt: toIsoUtc(form.startsAt),
      endsAt: form.endsAt ? toIsoUtc(form.endsAt) : '',
      priceCents: priceEurosToCents(form.priceEuros),
    })
    if (!parsed.success) {
      setFeedback({ kind: 'error', message: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' })
      return
    }
    const ok = await runAction(
      () => upsertEvent({ data: parsed.data }),
      (result) => withPrivatisation(form.id ? 'Événement mis à jour.' : 'Événement créé.', result),
    )
    if (ok) setForm(null)
  }

  function togglePublish(ev: EventRow) {
    // Seul `published` est écrit : dépublier passe toujours, publier exige une fin et un prix.
    if (!ev.published && !canPublishEvent(ev)) {
      setFeedback({ kind: 'error', message: 'Ajoutez une heure de fin et un prix avant de publier' })
      return
    }
    void runAction(
      () => setEventPublished({ data: { id: ev.id, published: !ev.published } }),
      (result) =>
        withPrivatisation(ev.published ? 'Événement dépublié.' : 'Événement publié sur le site.', result),
    )
  }

  function remove(ev: EventRow) {
    if (!window.confirm(`Supprimer définitivement « ${ev.title} » ?`)) return
    void runAction(() => deleteEvent({ data: { id: ev.id } }), 'Événement supprimé.')
  }

  return (
    <div className="tara-admin-page">
      <ReservationsTabs />
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Programme de la maison</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">
            Événements
          </h1>
          <p className="tara-page-intro">
            Ateliers spéciaux, soirées et rendez-vous, avec leurs propres places et le prix par personne,
            payé en totalité en ligne.
            Les événements publiés apparaissent sur le site (calendrier + accueil) et se réservent
            en ligne.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ ...EMPTY_EVENT_FORM })
            setFeedback(undefined)
          }}
          className="tara-primary-action inline-flex items-center gap-2"
        >
          <Plus size={16} aria-hidden="true" /> Nouvel événement
        </button>
      </div>

      {feedback ? <Feedback kind={feedback.kind}>{feedback.message}</Feedback> : null}

      {form ? (
        <EventForm
          form={form}
          pending={pending}
          onChange={setForm}
          onSave={save}
          onCancel={() => setForm(null)}
        />
      ) : null}

      <section className="mt-6 overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
        {events.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-600">
            Aucun événement pour l’instant. Créez le premier avec « Nouvel événement ».
          </p>
        ) : (
          <ul className="divide-y divide-[#4A5D2E]/12">
            {events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E4ECD8] px-2.5 py-0.5 text-xs font-semibold text-[#31421E]">
                      {eventTypeLabel(ev.eventType)}
                    </span>
                    {ev.published ? (
                      <span className="text-xs font-medium text-[#4A5D2E]">● Publié</span>
                    ) : (
                      <span className="text-xs font-medium text-neutral-400">○ Brouillon</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-[#1A1815]">{ev.title}</p>
                  <p className="text-xs capitalize text-neutral-500">
                    {DATE_FMT.format(new Date(ev.startsAt))} · {ev.capacity} places
                  </p>
                  <p className="text-xs text-neutral-500">
                    {ev.priceCents > 0 ? formatPricePerPerson(ev.priceCents) : 'Prix à définir'}
                    {' · '}
                    {ev.endsAt ? formatDuration(ev.startsAt, ev.endsAt) : 'Fin à définir'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton label={ev.published ? 'Dépublier' : 'Publier'} onClick={() => togglePublish(ev)} disabled={pending}>
                    {ev.published ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                  <IconButton label="Modifier" onClick={() => edit(ev)} disabled={pending}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label="Supprimer" danger onClick={() => remove(ev)} disabled={pending}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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

function Feedback({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`mt-5 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
        kind === 'success' ? 'bg-[#E9F0DF] text-[#31421E]' : 'bg-red-50 text-red-800'
      }`}
    >
      <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
