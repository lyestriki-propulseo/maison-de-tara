import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { getAgendaData, saveScheduleGrid } from '@/lib/admin-data'
import { getAtelierDeposit } from '@/lib/booking-settings-data'
import { ReservationsTabs } from '@/components/admin/ReservationsTabs'
import { ScheduleGridEditor } from '@/components/admin/ScheduleGridEditor'
import { AtelierDepositSetting } from '@/components/admin/AtelierDepositSetting'
import type { ScheduleSlot } from '@/lib/admin-schedule'

const LONG_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

// Réservations › Réglages : ce qui se règle rarement (grille des créneaux, acompte de l'atelier).
export const Route = createFileRoute('/admin/reglages')({
  loader: async () => {
    const [agenda, deposit] = await Promise.all([getAgendaData(), getAtelierDeposit()])
    return { templates: agenda.templates, depositCents: deposit.cents }
  },
  component: ReglagesPage,
})

function ReglagesPage() {
  const router = useRouter()
  const { templates, depositCents } = Route.useLoaderData()
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string }>()

  async function saveGrid(slots: Array<ScheduleSlot>, until: string) {
    setPending(true)
    setFeedback(undefined)
    try {
      await saveScheduleGrid({ data: { slots, until } })
      await router.invalidate()
      const untilLabel = LONG_DATE.format(new Date(`${until}T12:00:00Z`))
      setFeedback({
        kind: 'success',
        message: `Horaires enregistrés, créneaux créés jusqu’au ${untilLabel}.`,
      })
      return true
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Une erreur inattendue est survenue',
      })
      return false
    } finally {
      setPending(false)
    }
  }

  const Icon = feedback?.kind === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div className="tara-admin-page">
      <ReservationsTabs />
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Réservations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">Réglages</h1>
          <p className="tara-page-intro">
            Les horaires habituels de l’atelier et l’acompte demandé en ligne. À régler une fois,
            puis de temps en temps.
          </p>
        </div>
      </div>

      {feedback ? (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`mb-5 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
            feedback.kind === 'success' ? 'bg-[#E9F0DF] text-[#31421E]' : 'bg-red-50 text-red-800'
          }`}
        >
          <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <ScheduleGridEditor templates={templates} pending={pending} onSave={saveGrid} />
      <AtelierDepositSetting initialCents={depositCents} />
    </div>
  )
}
