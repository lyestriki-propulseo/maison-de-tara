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
})
