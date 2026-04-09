import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingState } from '#domain/value_objects/planning_types'

/**
 * Abandon post-plan : l'utilisateur choisit "Plus tard".
 * Remet le trainingState à Idle sans générer de nouveau plan.
 * Le plan terminé reste en base avec le statut 'completed'.
 */
@inject()
export default class AbandonPlan {
  constructor(private userProfileRepo: UserProfileRepository) {}

  async execute(userId: number): Promise<void> {
    await this.userProfileRepo.update(userId, { trainingState: TrainingState.Idle })
  }
}
