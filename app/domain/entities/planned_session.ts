export type SessionType =
  | 'easy'
  | 'long_run'
  | 'tempo'
  | 'intervals'
  | 'recovery'
  | 'race'
  | 'cross_training'

export type IntensityZone = 'z1' | 'z2' | 'z3' | 'z4' | 'z5'

export type PlannedSessionStatus = 'pending' | 'completed' | 'skipped'

export interface IntervalBlock {
  repetitions: number
  distanceMeters: number | null
  durationSeconds: number | null
  targetPacePerKm: string | null
  recoverySeconds: number | null
}

export interface PlannedSession {
  id: number
  planId: number
  weekNumber: number
  dayOfWeek: number
  sessionType: SessionType
  description: string
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
