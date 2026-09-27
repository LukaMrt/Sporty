import type { NewTrainingPlan, TrainingPlan } from '#domain/entities/training_plan'
import type { NewPlannedWeek, PlannedWeek } from '#domain/entities/planned_week'
import type { NewPlannedSession, PlannedSession } from '#domain/entities/planned_session'

export abstract class TrainingPlanRepository {
  abstract create(data: NewTrainingPlan): Promise<TrainingPlan>
  abstract findById(id: number): Promise<TrainingPlan | null>
  abstract findByUserId(userId: number): Promise<TrainingPlan[]>
  abstract findActiveByUserId(userId: number): Promise<TrainingPlan | null>
  /** Comme findActiveByUserId, avec verrou de ligne (à utiliser dans une UnitOfWork) */
  abstract lockActiveByUserId(userId: number): Promise<TrainingPlan | null>
  /** Tous les plans actifs (tâches de fond) */
  abstract findAllActive(): Promise<TrainingPlan[]>
  abstract findActiveByGoalId(goalId: number): Promise<TrainingPlan | null>
  abstract update(
    id: number,
    data: Partial<Omit<TrainingPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TrainingPlan>
  abstract delete(id: number): Promise<void>

  abstract createWeek(data: NewPlannedWeek): Promise<PlannedWeek>
  /** Insertion en lot (une requête) */
  abstract createWeeks(data: NewPlannedWeek[]): Promise<PlannedWeek[]>
  abstract findWeeksByPlanId(planId: number): Promise<PlannedWeek[]>

  abstract createSession(data: NewPlannedSession): Promise<PlannedSession>
  /** Insertion en lot (une requête) */
  abstract createSessions(data: NewPlannedSession[]): Promise<PlannedSession[]>
  abstract findSessionById(id: number): Promise<PlannedSession | null>
  abstract findSessionsByPlanId(planId: number): Promise<PlannedSession[]>
  abstract updateSession(
    id: number,
    data: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PlannedSession>

  abstract deleteSession(id: number): Promise<void>
  abstract updateWeek(
    id: number,
    data: Partial<
      Pick<
        PlannedWeek,
        'phaseName' | 'phaseLabel' | 'isRecoveryWeek' | 'targetVolumeMinutes' | 'notes'
      >
    >
  ): Promise<PlannedWeek>
  /** Supprime la semaine et ses séances, puis renumérote les semaines suivantes */
  abstract deleteWeek(planId: number, weekNumber: number): Promise<void>
  abstract deleteSessionsFromWeek(planId: number, fromWeekNumber: number): Promise<void>
}
