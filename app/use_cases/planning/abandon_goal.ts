import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { PlanStatus, TrainingState } from '#domain/value_objects/planning_types'

@inject()
export default class AbandonGoal {
  constructor(
    private goalRepository: TrainingGoalRepository,
    private planRepository: TrainingPlanRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(goalId: number, userId: number): Promise<void> {
    await this.goalRepository.update(goalId, { status: 'abandoned' })

    const activePlan = await this.planRepository.findActiveByGoalId(goalId)
    if (activePlan) {
      await this.planRepository.update(activePlan.id, { status: PlanStatus.Abandoned })
    }

    await this.userProfileRepository.update(userId, {
      trainingState: TrainingState.Idle,
    })
  }
}
