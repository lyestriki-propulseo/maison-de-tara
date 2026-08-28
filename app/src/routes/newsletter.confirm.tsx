import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { addContactToList } from '@/lib/brevo/client'

const confirmNewsletter = createServerFn({ method: 'GET' })
  .validator(z.object({ token: z.uuid() }))
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { data: subscriber, error } = await db
      .from('newsletter_subscribers')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('confirm_token', data.token)
      .eq('status', 'pending')
      .select('email')
      .maybeSingle()
    if (error) throw new Error("Impossible de confirmer l'inscription.")

    if (subscriber) {
      try {
        await addContactToList(subscriber.email)
      } catch (err) {
        console.error('[newsletter-confirm]', err)
      }
    }
    return { confirmed: Boolean(subscriber) }
  })

const searchSchema = z.object({ token: z.uuid().optional() })

export const Route = createFileRoute('/newsletter/confirm')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    if (!deps.token) return { confirmed: false }
    return confirmNewsletter({ data: { token: deps.token } })
  },
  component: NewsletterConfirmPage,
})

function NewsletterConfirmPage() {
  const { confirmed } = Route.useLoaderData()
  return (
    <div className="mx-auto mt-24 max-w-md px-6 text-center">
      {confirmed ? (
        <>
          <h1 className="text-2xl font-semibold text-[#1A1815]">Inscription confirmée</h1>
          <p className="mt-3 text-neutral-600">Merci ! Vous recevrez désormais les nouvelles de la Maison de Tara.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-[#1A1815]">Lien invalide</h1>
          <p className="mt-3 text-neutral-600">
            Ce lien de confirmation n'est plus valide. Réinscrivez-vous depuis le site si besoin.
          </p>
        </>
      )}
    </div>
  )
}
