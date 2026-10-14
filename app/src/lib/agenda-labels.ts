// Libellé d'un créneau bloqué dans l'agenda (US-004 CA-06). Un créneau bloqué par une
// privatisation porte la note « Privatisé : <titre> » (posée par sync_event_privatisation,
// migration 20260929100000) : on l'affiche pour que Tara sache pourquoi il est fermé.
// Un blocage manuel garde « Bloqué » (sa note interne reste privée au panneau de détail).
const PRIVATISATION_PREFIX = 'Privatisé : '

export function blockedSlotLabel(note: string | null): string {
  return note?.startsWith(PRIVATISATION_PREFIX) ? note : 'Bloqué'
}
