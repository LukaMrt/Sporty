import type { TrainingPlan } from '#domain/entities/training_plan'
import { PlanType } from '#domain/value_objects/planning_types'

const DISTANCE_BY_PLAN_TYPE: Record<string, number> = {
  [PlanType.FiveKm]: 5,
  [PlanType.TenKm]: 10,
  [PlanType.HalfMarathon]: 21.0975,
  [PlanType.Marathon]: 42.195,
}

/**
 * Distance cible d'un plan : celle de l'objectif si connu, sinon déduite du type
 * de plan. Auparavant, un plan sans objectif (maintenance) était recalibré
 * comme une préparation marathon.
 */
export function planTargetDistanceKm(
  plan: Pick<TrainingPlan, 'level'>,
  goal: { targetDistanceKm: number } | null
): number {
  return goal?.targetDistanceKm ?? DISTANCE_BY_PLAN_TYPE[plan.level] ?? 10
}
