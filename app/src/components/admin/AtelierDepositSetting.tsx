import { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { saveAtelierDeposit } from '@/lib/booking-settings-data'
import { atelierDepositSchema } from '@/lib/booking-settings'

// Acompte par personne demandé en ligne pour l'atelier libre (les événements ont le leur).
export function AtelierDepositSetting({ initialCents }: { initialCents: number }) {
  const [euros, setEuros] = useState(String(initialCents / 100))
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string }>()

  async function onSave() {
    setFeedback(undefined)
    const parsed = atelierDepositSchema.safeParse({ cents: Math.round(Number(euros) * 100) })
    if (!parsed.success || euros.trim() === '') {
      setFeedback({ kind: 'error', message: 'Montant invalide : entre 0 et 100 € par personne.' })
      return
    }
    setPending(true)
    try {
      await saveAtelierDeposit({ data: parsed.data })
      setFeedback({
        kind: 'success',
        message:
          parsed.data.cents === 0
            ? 'Acompte supprimé : les réservations d’atelier sont confirmées sans paiement.'
            : 'Acompte enregistré. Pensez à mettre à jour le montant dans les textes du site (Contenu › Atelier et Contact › FAQ).',
      })
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Une erreur inattendue est survenue',
      })
    } finally {
      setPending(false)
    }
  }

  const Icon = feedback?.kind === 'success' ? CheckCircle2 : AlertCircle

  return (
    <section className="mt-8 rounded-xl border border-[#4A5D2E]/15 bg-white p-5">
      <h2 className="text-lg font-semibold text-[#1A1815]">Acompte de l’atelier libre</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
        Montant payé en ligne par personne à la réservation d’un atelier libre, déduit de la facture
        sur place. Mettez 0 pour ne rien demander. Les événements ont leur propre acompte.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-neutral-600">
          Acompte par personne (€)
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={euros}
            onChange={(e) => setEuros(e.target.value)}
            className="mt-1 block min-h-10 w-40 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onSave()}
          className="min-h-10 rounded-lg bg-[#4A5D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3B4B24] disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer l’acompte'}
        </button>
      </div>
      {feedback ? (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`mt-4 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
            feedback.kind === 'success' ? 'bg-[#E9F0DF] text-[#31421E]' : 'bg-red-50 text-red-800'
          }`}
        >
          <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          <span>{feedback.message}</span>
        </div>
      ) : null}
    </section>
  )
}
