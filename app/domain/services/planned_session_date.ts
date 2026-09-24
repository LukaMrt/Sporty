// Import relatif : ce module pur est aussi importé par le frontend (Vite)
import { addDaysIso, dayOfWeekIso } from './calendar.js'

/**
 * Date calendaire d'une séance planifiée.
 *
 * Une « semaine » de plan commence le jour de `startDate` (quel qu'il soit :
 * lundi pour un plan généré, aujourd'hui pour une transition/maintenance).
 * `dayOfWeek` suit la convention JS (0 = dimanche) ; la séance tombe au premier
 * jour correspondant à partir du début de sa semaine de plan.
 *
 * Source unique utilisée par le backend ET exposée au frontend.
 */
export function plannedSessionDate(
  startDate: string,
  weekNumber: number,
  dayOfWeek: number
): string {
  const weekStart = addDaysIso(startDate, (weekNumber - 1) * 7)
  const offset = (dayOfWeek - dayOfWeekIso(startDate) + 7) % 7
  return addDaysIso(weekStart, offset)
}

/** Date du dernier jour (inclus) d'une semaine de plan */
export function plannedWeekEndDate(startDate: string, weekNumber: number): string {
  return addDaysIso(startDate, weekNumber * 7 - 1)
}

/** Numéro de la semaine de plan contenant `date` (peut être < 1 ou > nombre de semaines) */
export function planWeekNumberAt(startDate: string, date: string): number {
  const diff = Math.floor(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000
  )
  return Math.floor(diff / 7) + 1
}
