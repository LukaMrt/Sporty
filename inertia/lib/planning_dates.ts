// Module pur du domaine (aucune dépendance serveur) : même calcul de date que le backend
// eslint-disable-next-line @adonisjs/no-backend-import-in-frontend
import { plannedSessionDate } from '../../app/domain/services/planned_session_date'

/** Date réelle d'un jour dans une semaine du plan (même calcul que le backend) */
export function sessionDate(planStartDate: string, weekNumber: number, dayOfWeek: number): Date {
  // Minuit LOCAL : `new Date('YYYY-MM-DD')` serait minuit UTC (veille à l'ouest de Greenwich)
  return new Date(`${plannedSessionDate(planStartDate, weekNumber, dayOfWeek)}T00:00:00`)
}

export function isDateToday(d: Date) {
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}
