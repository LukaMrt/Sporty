import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingState } from '#domain/value_objects/planning_types'
import CloseFinishedGoal from '#use_cases/planning/close_finished_goal'

/**
 * Abandon post-plan : l'utilisateur choisit "Plus tard".
 * Remet le trainingState à Idle sans générer de nouveau plan.
 * Le plan terminé reste en base avec le statut 'completed' ; son objectif est clos.
 */
@inject()
export default class AbandonPlan {
  constructor(
    private userProfileRepo: UserProfileRepository,
    private closeFinishedGoal: CloseFinishedGoal
  ) {}

  async execute(userId: number): Promise<void> {
    await this.closeFinishedGoal.execute(userId)
    await this.userProfileRepo.update(userId, { trainingState: TrainingState.Idle })
  }
}
