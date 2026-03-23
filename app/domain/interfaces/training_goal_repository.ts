import type { TrainingGoal } from '#domain/entities/training_goal'

export abstract class TrainingGoalRepository {
  abstract create(data: Omit<TrainingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingGoal>
  abstract findById(id: number): Promise<TrainingGoal | null>
  abstract findByUserId(userId: number): Promise<TrainingGoal[]>
  abstract update(
    id: number,
    data: Partial<Omit<TrainingGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TrainingGoal>
  abstract delete(id: number): Promise<void>
}
