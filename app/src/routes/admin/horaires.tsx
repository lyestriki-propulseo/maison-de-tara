import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { getSiteHours, saveSiteHours } from '@/lib/site-data'
import { WEEKDAYS, hoursSchema, type Hours, type WeekdayKey } from '@/lib/site-settings'

export const Route = createFileRoute('/admin/horaires')({
  loader: () => getSiteHours(),
  component: HorairesPage,
})

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue'
}

function HorairesPage() {
  const router = useRouter()
  const initial = Route.useLoaderData()
  const [hours, setHours] = useState<Hours>(initial)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | undefined
  >()

  function updateDay(day: WeekdayKey, next: Hours[WeekdayKey]) {
    setHours((current) => ({ ...current, [day]: next }))
  }

  async function onSave() {
    setFeedback(undefined)
    const parsed = hoursSchema.safeParse(hours)
    if (!parsed.success) {
      setFeedback({
        kind: 'error',
        message: parsed.error.issues[0]?.message ?? 'Horaires invalides, vérifiez les plages.',
      })
      return
    }
    setPending(true)
    try {
      await saveSiteHours({ data: parsed.data })
      await router.invalidate()
      setFeedback({
        kind: 'success',
        message: 'Horaires enregistrés. Le site se met à jour automatiquement.',
      })
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="tara-admin-page">
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Le site</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">
            Horaires d’ouverture
          </h1>
          <p className="tara-page-intro">
            Les horaires d’ouverture de la maison. Ils s’affichent directement sur le site public
            (page contact, boutique) dès l’enregistrement.
          </p>
        </div>
      </div>

      {feedback ? <Feedback kind={feedback.kind}>{feedback.message}</Feedback> : null}

      <section className="tara-schedule-editor mt-6">
        <div className="overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
          <div className="divide-y divide-[#4A5D2E]/12">
            {WEEKDAYS.map(({ key, label }) => (
              <DayRow
                key={key}
                label={label}
                day={hours[key]}
                onChange={(next) => updateDay(key, next)}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onSave}
            className="min-h-11 shrink-0 rounded-lg bg-[#4A5D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer les horaires'}
          </button>
        </div>
      </section>
    </div>
  )
}

function DayRow({
  label,
  day,
  onChange,
}: {
  label: string
  day: Hours[WeekdayKey]
  onChange: (next: Hours[WeekdayKey]) => void
}) {
  function setClosed(closed: boolean) {
    onChange({ closed, ranges: closed ? [] : day.ranges.length ? day.ranges : [{ start: '10:00', end: '18:00' }] })
  }
  function updateRange(index: number, patch: Partial<{ start: string; end: string }>) {
    onChange({
      ...day,
      ranges: day.ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    })
  }
  function addRange() {
    onChange({ closed: false, ranges: [...day.ranges, { start: '14:00', end: '18:00' }] })
  }
  function removeRange(index: number) {
    onChange({ ...day, ranges: day.ranges.filter((_, i) => i !== index) })
  }

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[130px_1fr] md:items-start">
      <div className="flex items-center justify-between gap-3 md:pt-2">
        <span className="text-sm font-semibold text-[#1A1815]">{label}</span>
        <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 md:hidden">
          <input type="checkbox" checked={day.closed} onChange={(e) => setClosed(e.target.checked)} />
          Fermé
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="hidden items-center gap-1.5 text-xs font-medium text-neutral-600 md:flex">
          <input type="checkbox" checked={day.closed} onChange={(e) => setClosed(e.target.checked)} />
          Fermé ce jour
        </label>

        {day.closed ? (
          <p className="text-sm text-neutral-500">Fermé</p>
        ) : (
          <>
            {day.ranges.map((range, index) => (
              <div key={index} className="flex items-center gap-2">
                <TimeInput
                  label={`Ouverture ${label}`}
                  value={range.start}
                  onChange={(v) => updateRange(index, { start: v })}
                />
                <span className="text-neutral-400" aria-hidden="true">
                  –
                </span>
                <TimeInput
                  label={`Fermeture ${label}`}
                  value={range.end}
                  onChange={(v) => updateRange(index, { end: v })}
                />
                <button
                  type="button"
                  onClick={() => removeRange(index)}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  aria-label={`Retirer cette plage du ${label}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRange}
              className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg border border-[#4A5D2E]/30 px-3 text-xs font-semibold text-[#4A5D2E] transition-colors hover:bg-[#4A5D2E]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
            >
              <Plus size={14} aria-hidden="true" /> Ajouter une plage
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15"
    />
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
