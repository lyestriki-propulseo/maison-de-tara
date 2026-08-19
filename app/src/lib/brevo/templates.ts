const ADMIN_URL = 'https://admin.maisondetara.propulseo-site.com'

function wrap(bodyHtml: string): string {
  return `<div style="font-family:sans-serif;color:#1A1815;line-height:1.6;max-width:520px">${bodyHtml}</div>`
}

export function reservationAlertForTara(params: {
  customerName: string
  partySize: number
  targetLabel: string
  customerEmail: string
  customerPhone: string | null
}): { subject: string; html: string } {
  return {
    subject: `Nouvelle réservation en ligne — ${params.customerName}`,
    html: wrap(`
      <p><strong>${params.customerName}</strong> vient de réserver via le site.</p>
      <p>${params.targetLabel} — ${params.partySize} personne(s)</p>
      <p>Email : ${params.customerEmail}${params.customerPhone ? ` · Tél : ${params.customerPhone}` : ''}</p>
      <p><a href="${ADMIN_URL}/admin/reservations">Voir dans l'admin</a></p>
    `),
  }
}

export function reservationConfirmationForCustomer(params: {
  customerName: string
  targetLabel: string
}): { subject: string; html: string } {
  return {
    subject: 'Votre demande de réservation — Maison de Tara',
    html: wrap(`
      <p>Bonjour ${params.customerName},</p>
      <p>Votre demande de réservation pour <strong>${params.targetLabel}</strong> est bien enregistrée.</p>
      <p>Tara vous recontacte pour confirmer et prendre l'acompte.</p>
      <p>À très vite,<br>Maison de Tara</p>
    `),
  }
}

export function newsletterConfirmation(params: { confirmUrl: string }): { subject: string; html: string } {
  return {
    subject: 'Confirmez votre inscription à la lettre de la Maison de Tara',
    html: wrap(`
      <p>Bonjour,</p>
      <p>Un clic pour confirmer votre inscription à la lettre de la maison :</p>
      <p><a href="${params.confirmUrl}">Confirmer mon inscription</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
    `),
  }
}

export function requestAlertForTara(params: {
  requestType: 'contact' | 'privatisation'
  name: string
  email: string
  phone: string | null
  message: string
  partySize: number | null
  desiredDate: string | null
  eventType: string | null
}): { subject: string; html: string } {
  const label = params.requestType === 'privatisation' ? 'Nouvelle demande de privatisation' : 'Nouveau message'
  return {
    subject: `${label} — ${params.name}`,
    html: wrap(`
      <p><strong>${params.name}</strong> (${params.email}${params.phone ? `, ${params.phone}` : ''})</p>
      ${params.partySize ? `<p>${params.partySize} personne(s)${params.desiredDate ? ` · ${params.desiredDate}` : ''}${params.eventType ? ` · ${params.eventType}` : ''}</p>` : ''}
      <p>${params.message}</p>
    `),
  }
}

export function requestConfirmationForCustomer(params: {
  name: string
  requestType: 'contact' | 'privatisation'
}): { subject: string; html: string } {
  return {
    subject: 'Votre message — Maison de Tara',
    html: wrap(`
      <p>Bonjour ${params.name},</p>
      <p>Nous avons bien reçu votre ${params.requestType === 'privatisation' ? 'demande de privatisation' : 'message'}, on vous recontacte rapidement.</p>
      <p>À très vite,<br>Maison de Tara</p>
    `),
  }
}
