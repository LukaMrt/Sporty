import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { PlanStatus, PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
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

    if (plan.status === PlanStatus.Completed) return { state: 'plan_completed' }

    const sessions = await this.planRepo.findSessionsByPlanId(plan.id)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingNonRest = sessions
      .filter(
        (s) => s.status === PlannedSessionStatus.Pending && s.sessionType !== SessionType.Rest
      )
      .map((s) => ({
        session: s,
        date: this.#absoluteDate(plan.startDate, s.weekNumber, s.dayOfWeek),
      }))
      .filter(({ date }) => date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (upcomingNonRest.length === 0) return { state: 'plan_completed' }

    const next = upcomingNonRest[0]
    const isToday = this.#sameDay(next.date, today)
    const dateIso = next.date.toISOString().slice(0, 10)

    if (isToday) {
      return { state: 'upcoming', session: next.session, date: dateIso, isToday: true }
    }

    return { state: 'rest_today', nextSession: next.session, nextDate: dateIso }
  }

  /** Calcule la date absolue d'une séance (même logique que sessionDate() côté frontend) */
  #absoluteDate(planStartDate: string, weekNumber: number, dayOfWeek: number): Date {
    const start = new Date(planStartDate)
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() + (weekNumber - 1) * 7)
    const startDow = weekStart.getDay()
    const offset = (dayOfWeek - startDow + 7) % 7
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + offset)
    date.setHours(0, 0, 0, 0)
    return date
  }

  #sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }
}
