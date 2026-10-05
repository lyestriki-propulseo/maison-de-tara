// Libellés et helpers d'affichage pour le listing des réservations (ateliers + événements).

export const RESERVATION_STATUSES = [
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'cancelled', label: 'Annulée' },
  { value: 'no_show', label: 'Absent(e)' },
] as const

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]['value']

export function reservationStatusLabel(value: string): string {
  return RESERVATION_STATUSES.find((s) => s.value === value)?.label ?? value
}

export const RESERVATION_SOURCE_LABEL: Record<string, string> = {
  online: 'En ligne',
  manual: 'Manuelle',
}

export const RESERVATION_DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

export const RESERVATION_WHEN = ['upcoming', 'past'] as const
export type ReservationWhen = (typeof RESERVATION_WHEN)[number]

/**
 * Une réservation est « à venir » si le jour de sa cible (YYYY-MM-DD, Paris) est aujourd'hui ou
 * plus tard. Une cible supprimée (jour inconnu) part dans l'historique « Passées ».
 */
export function isUpcoming(targetDay: string | null, today: string): boolean {
  return targetDay != null && targetDay >= today
}
