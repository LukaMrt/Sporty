import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { PlanStatus, TrainingState } from '#domain/value_objects/planning_types'

export interface PostPlanState {
  trainingState: string
  goalDistanceKm: number | null
}

/**
 * Vérifie si l'utilisateur est dans un état post-plan (plan terminé, en attente de décision).
 * Retourne null si :
 * - Aucun plan terminé n'existe
 * - Le trainingState est Idle (l'utilisateur a déjà dit "Plus tard")
 */
@inject()
export default class GetPostPlanState {
  constructor(
    private planRepo: TrainingPlanRepository,
    private userProfileRepo: UserProfileRepository,
    private goalRepo: TrainingGoalRepository
  ) {}

  async execute(userId: number): Promise<PostPlanState | null> {
    const profile = await this.userProfileRepo.findByUserId(userId)
    if (!profile || profile.trainingState === TrainingState.Idle) return null

    const allPlans = await this.planRepo.findByUserId(userId)
    const completedPlan = allPlans.find((p) => p.status === PlanStatus.Completed)
    if (!completedPlan) return null

    const goal = completedPlan.goalId ? await this.goalRepo.findById(completedPlan.goalId) : null

    return {
      trainingState: profile.trainingState,
      goalDistanceKm: goal?.targetDistanceKm ?? null,
    }
  }
}
