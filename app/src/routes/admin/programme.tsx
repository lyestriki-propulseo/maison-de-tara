import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteEvent, listEvents, upsertEvent } from '@/lib/events-data'
import { EVENT_TYPES, eventInputSchema, eventTypeLabel, type EventType } from '@/lib/events'

export const Route = createFileRoute('/admin/programme')({
  loader: () => listEvents(),
  component: ProgrammePage,
})

type EventRow = Awaited<ReturnType<typeof listEvents>>[number]
type FormState = {
  id?: string
  title: string
  eventType: EventType
  description: string
  startsAt: string
  capacity: number
  depositEnabled: boolean
  depositAmountCents: number
  published: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  eventType: 'workshop',
  description: '',
  startsAt: '',
  capacity: 12,
  depositEnabled: true,
  depositAmountCents: 600,
  published: false,
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
  const [form, setForm] = useState<FormState | null>(null)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string }>()

  async function runAction(action: () => Promise<unknown>, success: string) {
    setPending(true)
    setFeedback(undefined)
    try {
      await action()
      await router.invalidate()
      setFeedback({ kind: 'success', message: success })
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
      eventType: ev.eventType as EventType,
      description: ev.description,
      startsAt: toLocalInput(ev.startsAt),
      capacity: ev.capacity,
      depositEnabled: ev.depositEnabled,
      depositAmountCents: ev.depositAmountCents ?? 600,
      published: ev.published,
    })
    setFeedback(undefined)
  }

  async function save() {
    if (!form) return
    const parsed = eventInputSchema.safeParse({
      ...form,
      startsAt: toIsoUtc(form.startsAt),
      depositAmountCents: form.depositEnabled ? form.depositAmountCents : null,
    })
    if (!parsed.success) {
      setFeedback({ kind: 'error', message: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' })
      return
    }
    const ok = await runAction(
      () => upsertEvent({ data: parsed.data }),
      form.id ? 'Événement mis à jour.' : 'Événement créé.',
    )
    if (ok) setForm(null)
  }

  function togglePublish(ev: EventRow) {
    void runAction(
      () =>
        upsertEvent({
          data: {
            id: ev.id,
            title: ev.title,
            eventType: ev.eventType as EventType,
            description: ev.description,
            startsAt: ev.startsAt,
            capacity: ev.capacity,
            depositEnabled: ev.depositEnabled,
            depositAmountCents: ev.depositAmountCents,
            published: !ev.published,
          },
        }),
      ev.published ? 'Événement dépublié.' : 'Événement publié sur le site.',
    )
  }

  function remove(ev: EventRow) {
    if (!window.confirm(`Supprimer définitivement « ${ev.title} » ?`)) return
    void runAction(() => deleteEvent({ data: { id: ev.id } }), 'Événement supprimé.')
  }

  return (
    <div className="tara-admin-page">
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Le site</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">
            Programme de la maison
          </h1>
          <p className="tara-page-intro">
            Ateliers, soirées et rendez-vous. Les événements publiés apparaissent sur le site
            (calendrier + accueil).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ ...EMPTY_FORM })
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

function EventForm({
  form,
  pending,
  onChange,
  onSave,
  onCancel,
}: {
  form: FormState
  pending: boolean
  onChange: (next: FormState) => void
  onSave: () => void
  onCancel: () => void
}) {
  const set = (patch: Partial<FormState>) => onChange({ ...form, ...patch })
  const inputCls =
    'mt-1 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15'

  return (
    <section className="mt-6 rounded-xl border border-[#4A5D2E]/20 bg-[#F8F6F1] p-5">
      <h2 className="text-lg font-semibold text-[#1A1815]">
        {form.id ? 'Modifier l’événement' : 'Nouvel événement'}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-neutral-600 sm:col-span-2">
          Titre
          <input className={inputCls} value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Type
          <select className={inputCls} value={form.eventType} onChange={(e) => set({ eventType: e.target.value as EventType })}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Date et heure
          <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600 sm:col-span-2">
          Description
          <textarea className={`${inputCls} min-h-20`} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Places
          <input type="number" min={1} max={200} className={inputCls} value={form.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Acompte (€) à la réservation
          <input
            type="number"
            min={0}
            step={1}
            disabled={!form.depositEnabled}
            className={`${inputCls} disabled:opacity-50`}
            value={Math.round(form.depositAmountCents / 100)}
            onChange={(e) => set({ depositAmountCents: Math.round(Number(e.target.value) * 100) })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={form.depositEnabled} onChange={(e) => set({ depositEnabled: e.target.checked })} />
          Acompte demandé en ligne
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} />
          Publié sur le site
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="min-h-10 rounded-lg bg-[#4A5D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </section>
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
