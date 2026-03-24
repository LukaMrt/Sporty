// Frontend-only type definitions for planning — mirrors domain entities
// These are intentionally decoupled from backend types.

export type TrainingGoalStatus = 'active' | 'achieved' | 'abandoned'

export interface TrainingGoal {
  id: number
  userId: number
  targetDistanceKm: number
  targetTimeMinutes: number | null
  eventDate: string | null
  status: TrainingGoalStatus
  createdAt: string
  updatedAt: string
}

export type TrainingMethodology = 'polarized' | 'pyramidal' | 'threshold' | 'daniels'
export type PlanType = 'marathon' | 'half_marathon' | '10km' | '5km' | 'custom'
export type PlanStatus = 'draft' | 'active' | 'completed' | 'abandoned'

export interface TrainingPlan {
  id: number
  userId: number
  goalId: number | null
  methodology: TrainingMethodology
  level: PlanType
  status: PlanStatus
  autoRecalibrate: boolean
  vdotAtCreation: number
  currentVdot: number
  sessionsPerWeek: number
  preferredDays: number[]
  startDate: string
  endDate: string
  lastRecalibratedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PlannedWeek {
  id: number
  planId: number
  weekNumber: number
  phaseName: string
  phaseLabel: string
  isRecoveryWeek: boolean
  targetVolumeMinutes: number
  createdAt: string
  updatedAt: string
}

export type SessionType =
  | 'easy'
  | 'long_run'
  | 'tempo'
  | 'marathon_pace'
  | 'interval'
  | 'repetition'
  | 'recovery'
  | 'race'
  | 'cross_training'
  | 'rest'

export type IntensityZone = 'z1' | 'z2' | 'z3' | 'z4' | 'z5'
export type PlannedSessionStatus = 'pending' | 'completed' | 'skipped'

export interface IntervalBlock {
  type: 'warmup' | 'work' | 'recovery' | 'cooldown'
  durationMinutes: number | null
  distanceMeters: number | null
  targetPace: string | null
  intensityZone: IntensityZone
  repetitions: number
  recoveryDurationMinutes: number | null
  recoveryType: 'jog' | 'rest' | null
}

export interface PlannedSession {
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

export interface PlanOverview {
  goal: TrainingGoal
  plan: TrainingPlan
  weeks: PlannedWeek[]
  currentWeekNumber: number
  sessionsByWeek: Record<string, PlannedSession[]>
}
