export type PlanMethodology = 'vdot' | 'custom'
export type PlanType = 'base' | 'intermediate' | 'advanced'
export type PlanStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface TrainingPlan {
  id: number
  userId: number
  goalId: number | null
  methodology: PlanMethodology
  planType: PlanType
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
