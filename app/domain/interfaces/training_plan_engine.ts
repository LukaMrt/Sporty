import type {
  SessionType,
  IntensityZone,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'
import type { IntervalBlock } from '#domain/entities/planned_session'
import type { PlanRequest } from '#domain/value_objects/plan_request'
import type { RecalibrationContext } from '#domain/value_objects/recalibration_context'
import type { MaintenancePlanRequest } from '#domain/value_objects/maintenance_plan_request'
import type { TransitionPlanRequest } from '#domain/value_objects/transition_plan_request'

export interface GeneratedSession {
  dayOfWeek: number
  sessionType: SessionType
  targetDurationMinutes: number
  targetDistanceKm: number | null
  targetPacePerKm: string | null
  intensityZone: IntensityZone
  intervals: IntervalBlock[] | null
}

export interface GeneratedWeek {
  weekNumber: number
  phaseName: string
  isRecoveryWeek: boolean
  targetVolumeMinutes: number
  sessions: GeneratedSession[]
}

export interface GeneratedPlan {
  weeks: GeneratedWeek[]
  methodology: TrainingMethodology
  totalWeeks: number
}

export abstract class TrainingPlanEngine {
  abstract generatePlan(request: PlanRequest): GeneratedPlan
  abstract recalibrate(context: RecalibrationContext): GeneratedPlan
  abstract generateMaintenancePlan(request: MaintenancePlanRequest): GeneratedPlan
  abstract generateTransitionPlan(request: TransitionPlanRequest): GeneratedPlan
}
