import type {
  TrainingMethodology,
  PlanType,
  PlanStatus,
  PlanSource,
} from '#domain/value_objects/planning_types'

export type { TrainingMethodology, PlanType, PlanStatus, PlanSource }

export type TrainingPlan = {
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
  source: PlanSource
  /** Nom libre (plans importés ou renommés) */
  name: string | null
  /** Consignes générales du plan */
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type NewTrainingPlan = Omit<
  TrainingPlan,
  'id' | 'createdAt' | 'updatedAt' | 'source' | 'name' | 'notes'
> &
  Partial<Pick<TrainingPlan, 'source' | 'name' | 'notes'>>
