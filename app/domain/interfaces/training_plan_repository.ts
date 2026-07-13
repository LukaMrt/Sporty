import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'

export type NewPlannedWeekData = Omit<PlannedWeek, 'id' | 'planId' | 'createdAt' | 'updatedAt'>
export type NewPlannedSessionData = Omit<
  PlannedSession,
  'id' | 'planId' | 'createdAt' | 'updatedAt'
>

export interface PlanGraphWeek {
  week: NewPlannedWeekData
  sessions: NewPlannedSessionData[]
}

export interface PlanGraph {
  plan: TrainingPlan
  weeks: PlannedWeek[]
  sessions: PlannedSession[]
}

export interface WeekReplacement {
  weekNumber: number
  isRecoveryWeek: boolean
  targetVolumeMinutes: number
  sessions: NewPlannedSessionData[]
}

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
  abstract updateWeekByNumber(
    planId: number,
    weekNumber: number,
    data: Partial<Pick<PlannedWeek, 'isRecoveryWeek' | 'targetVolumeMinutes'>>
  ): Promise<void>

  abstract createSession(
    data: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PlannedSession>
  abstract findSessionById(id: number): Promise<PlannedSession | null>
  abstract findSessionsByPlanId(planId: number): Promise<PlannedSession[]>
  abstract updateSession(
    id: number,
    data: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PlannedSession>

  abstract deleteSessionsFromWeek(planId: number, fromWeekNumber: number): Promise<void>

  /**
   * Crée un plan complet (plan + semaines + séances) en une opération.
   * Les implémentations persistantes DOIVENT être atomiques (transaction) :
   * un échec partiel laisserait un plan actif inutilisable qui bloque
   * toute régénération.
   */
  async createPlanGraph(
    planData: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>,
    weeks: PlanGraphWeek[]
  ): Promise<PlanGraph> {
    const plan = await this.create(planData)
    const savedWeeks: PlannedWeek[] = []
    const savedSessions: PlannedSession[] = []
    for (const { week, sessions } of weeks) {
      savedWeeks.push(await this.createWeek({ ...week, planId: plan.id }))
      for (const session of sessions) {
        savedSessions.push(await this.createSession({ ...session, planId: plan.id }))
      }
    }
    return { plan, weeks: savedWeeks, sessions: savedSessions }
  }

  /**
   * Remplace les semaines restantes d'un plan (recalibration) : supprime les
   * séances à partir de fromWeekNumber, met à jour les volumes des semaines et
   * insère les nouvelles séances. Les implémentations persistantes DOIVENT
   * être atomiques : un échec entre suppression et réinsertion détruirait
   * définitivement la fin du plan.
   */
  async replaceFromWeek(
    planId: number,
    fromWeekNumber: number,
    weeks: WeekReplacement[]
  ): Promise<void> {
    await this.deleteSessionsFromWeek(planId, fromWeekNumber)
    for (const week of weeks) {
      await this.updateWeekByNumber(planId, week.weekNumber, {
        isRecoveryWeek: week.isRecoveryWeek,
        targetVolumeMinutes: week.targetVolumeMinutes,
      })
      for (const session of week.sessions) {
        await this.createSession({ ...session, planId })
      }
    }
  }
}
