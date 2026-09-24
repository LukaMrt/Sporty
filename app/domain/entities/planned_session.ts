import type {
  SessionType,
  IntensityZone,
  PlannedSessionStatus,
} from '#domain/value_objects/planning_types'

export type { SessionType, IntensityZone, PlannedSessionStatus }

export type IntervalBlock = {
  type: 'warmup' | 'work' | 'recovery' | 'cooldown'
  durationMinutes: number | null
  distanceMeters: number | null
  targetPace: string | null
  intensityZone: IntensityZone
  repetitions: number
  recoveryDurationMinutes: number | null
  recoveryType: 'jog' | 'rest' | null
}

export type PlannedSession = {
  id: number
  planId: number
  weekNumber: number
  dayOfWeek: number
  sessionType: SessionType
  targetDurationMinutes: number
  targetDistanceKm: number | null
  targetPacePerKm: string | null
  intensityZone: IntensityZone
  intervals: IntervalBlock[] | null
  targetLoadTss: number | null
  completedSessionId: number | null
  status: PlannedSessionStatus
  createdAt: string
  updatedAt: string
}
