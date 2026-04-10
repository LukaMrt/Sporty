import type { PaceZones } from '#domain/value_objects/pace_zones'

export interface TransitionPlanRequest {
  vdot: number
  paceZones: PaceZones
  sessionsPerWeek: number
  preferredDays: number[]
  previousPeakVolumeMinutes: number
  raceDistanceKm: number
}
