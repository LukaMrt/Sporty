import type { PaceZones } from '#domain/value_objects/pace_zones'

export interface PlanRequest {
  targetDistanceKm: number
  targetTimeMinutes: number | null
  eventDate: string | null
  vdot: number
  paceZones: PaceZones
  totalWeeks: number
  sessionsPerWeek: number
  preferredDays: number[]
  startDate: string
  currentWeeklyVolumeMinutes: number
}
