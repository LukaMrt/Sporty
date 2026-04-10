import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'

export interface WeekDetail {
  week: PlannedWeek
  sessions: PlannedSession[]
}

@inject()
export default class GetWeekDetail {
  constructor(private planRepo: TrainingPlanRepository) {}

  async execute(planId: number, weekNumber: number): Promise<WeekDetail | null> {
    const weeks = await this.planRepo.findWeeksByPlanId(planId)
    const week = weeks.find((w) => w.weekNumber === weekNumber)
    if (!week) return null

    const allSessions = await this.planRepo.findSessionsByPlanId(planId)
    const sessions = allSessions.filter((s) => s.weekNumber === weekNumber)

    return { week, sessions }
  }
}
