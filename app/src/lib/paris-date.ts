const PARIS_DAY = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Date du jour à Paris (YYYY-MM-DD) — le serveur tourne en UTC. */
export function parisToday(now: Date = new Date()): string {
  return PARIS_DAY.format(now)
}

function isoToUtcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`)
}

export function addDaysIso(iso: string, days: number): string {
  const date = isoToUtcNoon(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function endOfYearIso(iso: string): string {
  return `${iso.slice(0, 4)}-12-31`
}

export function daysBetweenInclusive(from: string, to: string): number {
  const ms = isoToUtcNoon(to).getTime() - isoToUtcNoon(from).getTime()
  return Math.round(ms / 86_400_000) + 1
}
