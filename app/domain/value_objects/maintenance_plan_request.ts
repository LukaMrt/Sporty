import type { PaceZones } from '#domain/value_objects/pace_zones'

export interface MaintenancePlanRequest {
  vdot: number
  paceZones: PaceZones
  sessionsPerWeek: number
  preferredDays: number[]
  currentWeeklyVolumeMinutes: number
}
