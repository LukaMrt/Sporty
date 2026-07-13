import type { PaceZones } from '#domain/value_objects/pace_zones'
import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'
import type { PlanRequest } from '#domain/value_objects/plan_request'

/**
 * Contexte de recalibration d'un plan en cours.
 *
 * Contrat moteur ↔ appelant :
 * - `remainingWeeks` sont les semaines à régénérer, numérotées comme dans le
 *   plan d'origine (première = `currentWeekNumber + 1`). Le moteur DOIT
 *   conserver ces numéros de semaine et régénérer exactement cet ensemble.
 * - `originalRequest.currentWeeklyVolumeMinutes` est le volume de départ de la
 *   première semaine régénérée (les appelants y appliquent leur facteur de
 *   charge) ; le moteur DOIT l'honorer quand il est > 0.
 */
export interface RecalibrationContext {
  currentWeekNumber: number
  newVdot: number
  newPaceZones: PaceZones
  remainingWeeks: GeneratedWeek[]
  originalRequest: PlanRequest
}
