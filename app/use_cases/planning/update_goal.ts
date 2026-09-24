import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import type { TrainingGoal } from '#domain/entities/training_goal'
import { GoalNotFoundError } from '#domain/errors/goal_not_found_error'

export interface UpdateGoalInput {
  goalId: number
  userId: number
  targetDistanceKm?: number
  targetTimeMinutes?: number | null
  eventDate?: string | null
}

@inject()
export default class UpdateGoal {
  constructor(private goalRepository: TrainingGoalRepository) {}

  async execute(input: UpdateGoalInput): Promise<TrainingGoal> {
    const goal = await this.goalRepository.findById(input.goalId)
    if (!goal || goal.userId !== input.userId) throw new GoalNotFoundError(input.goalId)

    const updates: Partial<Omit<TrainingGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = {}
    if (input.targetDistanceKm !== undefined) updates.targetDistanceKm = input.targetDistanceKm
    if (input.targetTimeMinutes !== undefined) updates.targetTimeMinutes = input.targetTimeMinutes
    if (input.eventDate !== undefined) updates.eventDate = input.eventDate

    return this.goalRepository.update(input.goalId, updates)
  }
}
