import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { ActiveGoalExistsError } from '#domain/errors/active_goal_exists_error'
import { TrainingState } from '#domain/value_objects/planning_types'
import type { TrainingGoal } from '#domain/entities/training_goal'

export interface CreateGoalInput {
  userId: number
  targetDistanceKm: number
  targetTimeMinutes?: number | null
  eventDate?: string | null
}

@inject()
export default class CreateGoal {
  constructor(
    private goalRepository: TrainingGoalRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(input: CreateGoalInput): Promise<TrainingGoal> {
    const existing = await this.goalRepository.findActiveByUserId(input.userId)
    if (existing) {
      throw new ActiveGoalExistsError()
    }

    const goal = await this.goalRepository.create({
      userId: input.userId,
      targetDistanceKm: input.targetDistanceKm,
      targetTimeMinutes: input.targetTimeMinutes ?? null,
      eventDate: input.eventDate ?? null,
      status: 'active',
    })

    await this.userProfileRepository.update(input.userId, {
      trainingState: TrainingState.InPlan,
    })

    return goal
  }
}
