import type {
  TrainingMethodology,
  PlanType,
  PlanStatus,
} from '#domain/value_objects/planning_types'

export type { TrainingMethodology, PlanType, PlanStatus }

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
  pendingVdotDown: number | null
  createdAt: string
  updatedAt: string
}
