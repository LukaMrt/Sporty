import type { TrainingPlan } from '#domain/entities/training_plan'
import { planWeekNumberAt } from '#domain/services/planned_session_date'

/** Semaine courante d'un plan à la date `today`, bornée à [1, totalWeeks] */
export function currentPlanWeek(
  plan: Pick<TrainingPlan, 'startDate'>,
  totalWeeks: number,
  today: string
): number {
  return Math.max(1, Math.min(planWeekNumberAt(plan.startDate, today), Math.max(totalWeeks, 1)))
}
