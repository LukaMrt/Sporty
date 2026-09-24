import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { PlannedWeek } from '#domain/entities/planned_week'
import { plannedSessionDate } from '#domain/services/planned_session_date'
import type { PlannedSessionView } from '#use_cases/planning/get_plan_overview'

export interface WeekDetail {
  week: PlannedWeek
  sessions: PlannedSessionView[]
}

@inject()
export default class GetWeekDetail {
  constructor(private planRepo: TrainingPlanRepository) {}

  async execute(planId: number, weekNumber: number): Promise<WeekDetail | null> {
    const plan = await this.planRepo.findById(planId)
    if (!plan) return null
    const weeks = await this.planRepo.findWeeksByPlanId(planId)
    const week = weeks.find((w) => w.weekNumber === weekNumber)
    if (!week) return null

    const allSessions = await this.planRepo.findSessionsByPlanId(planId)
    const sessions = allSessions
      .filter((s) => s.weekNumber === weekNumber)
      .map((s) => ({ ...s, date: plannedSessionDate(plan.startDate, s.weekNumber, s.dayOfWeek) }))

    return { week, sessions }
  }
}
