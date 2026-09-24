/**
 * Utilitaires de dates « calendaires » (YYYY-MM-DD), indépendants du fuseau du serveur.
 */

/** Date du jour dans le fuseau de l'athlète (IANA, ex. Europe/Paris) ; UTC si inconnu/invalide */
export function todayInTimezone(timezone?: string | null, now: Date = new Date()): string {
  if (timezone) {
    try {
      // en-CA formate en YYYY-MM-DD
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now)
    } catch {
      // fuseau invalide : repli UTC
    }
  }
  return now.toISOString().slice(0, 10)
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Nombre de jours entre deux dates calendaires (b − a) */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** Jour de la semaine d'une date calendaire (0 = dimanche … 6 = samedi) */
export function dayOfWeekIso(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}
