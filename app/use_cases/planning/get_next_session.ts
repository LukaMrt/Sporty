import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import { formatIsoDate, plannedSessionDate } from '#domain/services/plan_calendar'
import type { PlannedSession } from '#domain/entities/planned_session'

export type NextSessionResult =
  | { state: 'plan_completed' }
  | { state: 'upcoming'; session: PlannedSession; date: string; isToday: boolean }
  | { state: 'rest_today'; nextSession: PlannedSession; nextDate: string }

@inject()
export default class GetNextSession {
  constructor(private planRepo: TrainingPlanRepository) {}

  async execute(userId: number): Promise<NextSessionResult | null> {
    const plan = await this.planRepo.findActiveByUserId(userId)
    if (!plan) return null

    const sessions = await this.planRepo.findSessionsByPlanId(plan.id)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingNonRest = sessions
      .filter(
        (s) => s.status === PlannedSessionStatus.Pending && s.sessionType !== SessionType.Rest
      )
      .map((s) => ({
        session: s,
        date: plannedSessionDate(plan.startDate, s.weekNumber, s.dayOfWeek),
      }))
      .filter(({ date }) => date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (upcomingNonRest.length === 0) return { state: 'plan_completed' }

    const next = upcomingNonRest[0]
    const isToday = next.date.getTime() === today.getTime()
    const dateIso = formatIsoDate(next.date)

    if (isToday) {
      return { state: 'upcoming', session: next.session, date: dateIso, isToday: true }
    }

    return { state: 'rest_today', nextSession: next.session, nextDate: dateIso }
  }
}
