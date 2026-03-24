import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'

export abstract class TrainingPlanRepository {
  abstract create(data: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingPlan>
  abstract findById(id: number): Promise<TrainingPlan | null>
  abstract findByUserId(userId: number): Promise<TrainingPlan[]>
  abstract findActiveByUserId(userId: number): Promise<TrainingPlan | null>
  abstract findActiveByGoalId(goalId: number): Promise<TrainingPlan | null>
  abstract update(
    id: number,
    data: Partial<Omit<TrainingPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TrainingPlan>
  abstract delete(id: number): Promise<void>

  abstract createWeek(
    data: Omit<PlannedWeek, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PlannedWeek>
  abstract findWeeksByPlanId(planId: number): Promise<PlannedWeek[]>

  abstract createSession(
    data: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PlannedSession>
  abstract findSessionsByPlanId(planId: number): Promise<PlannedSession[]>
  abstract updateSession(
    id: number,
    data: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PlannedSession>
}
