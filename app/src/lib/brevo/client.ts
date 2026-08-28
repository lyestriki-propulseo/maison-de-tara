import { env } from '@/env'

const BREVO_API_URL = 'https://api.brevo.com/v3'
const SENDER_NAME = 'Maison de Tara'

export class BrevoError extends Error {}

type SendEmailParams = {
  to: { email: string; name?: string }
  subject: string
  html: string
}

function brevoHeaders(): Record<string, string> {
  return {
    'api-key': env.BREVO_API_KEY,
    'Content-Type': 'application/json',
    accept: 'application/json',
  }
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<void> {
  const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: brevoHeaders(),
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: params.to.email, name: params.to.name }],
      subject: params.subject,
      htmlContent: params.html,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new BrevoError(`Brevo a refusé l'envoi (${res.status}) : ${body}`)
  }
}

export async function addContactToList(email: string): Promise<void> {
  if (!env.BREVO_NEWSLETTER_LIST_ID) return
  const res = await fetch(`${BREVO_API_URL}/contacts`, {
    method: 'POST',
    headers: brevoHeaders(),
    body: JSON.stringify({
      email,
      listIds: [Number(env.BREVO_NEWSLETTER_LIST_ID)],
      updateEnabled: true,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new BrevoError(`Brevo a refusé l'ajout à la liste (${res.status}) : ${body}`)
  }
}
