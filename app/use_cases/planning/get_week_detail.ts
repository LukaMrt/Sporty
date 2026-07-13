import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'

export interface WeekDetail {
  week: PlannedWeek
  sessions: PlannedSession[]
}

/**
 * Détail d'une semaine du plan actif. Lecture pure — ne passe pas par
 * GetPlanOverview, qui a des effets de bord (transitions de fin de plan).
 */
@inject()
export default class GetWeekDetail {
  constructor(private planRepo: TrainingPlanRepository) {}

  async execute(userId: number, weekNumber: number): Promise<WeekDetail | null> {
    const plan = await this.planRepo.findActiveByUserId(userId)
    if (!plan) return null

    const weeks = await this.planRepo.findWeeksByPlanId(plan.id)
    const week = weeks.find((w) => w.weekNumber === weekNumber)
    if (!week) return null

    const allSessions = await this.planRepo.findSessionsByPlanId(plan.id)
    const sessions = allSessions.filter((s) => s.weekNumber === weekNumber)

    return { week, sessions }
  }
}
