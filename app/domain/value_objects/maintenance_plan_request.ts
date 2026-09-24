import type { PaceZones } from '#domain/value_objects/pace_zones'

export type MaintenancePlanRequest = {
  vdot: number
  paceZones: PaceZones
  sessionsPerWeek: number
  preferredDays: number[]
  currentWeeklyVolumeMinutes: number
}
