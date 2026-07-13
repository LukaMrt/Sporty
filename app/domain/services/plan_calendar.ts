// ── Calendrier du module planning ─────────────────────────────────────────────
// Convention unique : dayOfWeek suit Date.getDay() → 0=dimanche … 6=samedi.
// Les semaines de plan démarrent le lundi, l'ordre chronologique d'une semaine
// est donc [1, 2, 3, 4, 5, 6, 0]. Toute la logique de dates du module doit
// passer par ce service (le frontend réplique `plannedSessionDate` dans
// inertia/pages/Planning/Index.tsx — garder les deux implémentations alignées).
//
// Tous les calculs se font en temps LOCAL (jamais toISOString/UTC) pour éviter
// les bascules de jour en soirée selon le fuseau du serveur.

/** Jours d'une semaine de plan dans l'ordre chronologique (lundi → dimanche). */
export const WEEK_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

/** Index chronologique d'un jour dans la semaine de plan : lundi=0 … dimanche=6. */
export function chronologicalDayIndex(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7
}

/** Parse une date ISO (YYYY-MM-DD) en Date locale à minuit. */
export function parseIsoDate(dateIso: string): Date {
  const [year, month, day] = dateIso.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Formate une Date en ISO (YYYY-MM-DD) à partir de ses composantes locales. */
export function formatIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayIso(): string {
  return formatIsoDate(new Date())
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = parseIsoDate(dateIso)
  d.setDate(d.getDate() + days)
  return formatIsoDate(d)
}

export function addWeeksIso(dateIso: string, weeks: number): string {
  return addDaysIso(dateIso, weeks * 7)
}

/** Nombre de jours entiers entre deux dates ISO (positif si to > from). */
export function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

/** Prochain lundi strictement après aujourd'hui. */
export function nextMondayIso(): string {
  const d = new Date()
  const day = d.getDay() // 0 = dimanche, 1 = lundi, …
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysUntilNextMonday)
  return formatIsoDate(d)
}

/**
 * Date absolue d'une séance planifiée.
 * Formule de référence — identique à sessionDate() côté frontend.
 */
export function plannedSessionDate(
  planStartDate: string,
  weekNumber: number,
  dayOfWeek: number
): Date {
  const weekStart = parseIsoDate(planStartDate)
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7)
  const startDow = weekStart.getDay()
  const offset = (chronologicalDayIndex(dayOfWeek) - chronologicalDayIndex(startDow) + 7) % 7
  const date = new Date(weekStart)
  date.setDate(weekStart.getDate() + offset)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Numéro de semaine courante d'un plan, borné à [1, totalWeeks]. */
export function computeCurrentWeekNumber(
  startDateIso: string,
  totalWeeks: number,
  now: Date = new Date()
): number {
  const elapsed = daysBetween(startDateIso, formatIsoDate(now))
  const week = Math.floor(elapsed / 7) + 1
  return Math.max(1, Math.min(week, totalWeeks))
}
