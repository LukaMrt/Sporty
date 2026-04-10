import type { PaceZones } from '#domain/value_objects/pace_zones'
import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'
import type { PlanRequest } from '#domain/value_objects/plan_request'

export interface RecalibrationContext {
  currentWeekNumber: number
  newVdot: number
  newPaceZones: PaceZones
  remainingWeeks: GeneratedWeek[]
  originalRequest: PlanRequest
}
