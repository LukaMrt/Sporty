import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'

export interface PlanOverview {
  goal: TrainingGoal
  plan: TrainingPlan
  weeks: PlannedWeek[]
  currentWeekNumber: number
  sessionsByWeek: Record<number, PlannedSession[]>
}

@inject()
export default class GetPlanOverview {
  constructor(
    private goalRepo: TrainingGoalRepository,
    private planRepo: TrainingPlanRepository
  ) {}

  async execute(userId: number): Promise<PlanOverview | null> {
    const plan = await this.planRepo.findActiveByUserId(userId)
    if (!plan) return null

    const goal = await this.goalRepo.findActiveByUserId(userId)
    if (!goal) return null

    const weeks = await this.planRepo.findWeeksByPlanId(plan.id)
    const sessions = await this.planRepo.findSessionsByPlanId(plan.id)

    const currentWeekNumber = this.#computeCurrentWeek(plan.startDate, weeks.length)

    const sessionsByWeek: Record<number, PlannedSession[]> = {}
    for (const session of sessions) {
      if (!sessionsByWeek[session.weekNumber]) {
        sessionsByWeek[session.weekNumber] = []
      }
      sessionsByWeek[session.weekNumber].push(session)
    }

    return { goal, plan, weeks, currentWeekNumber, sessionsByWeek }
  }

  #computeCurrentWeek(startDate: string, totalWeeks: number): number {
    const start = new Date(startDate)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(diffWeeks + 1, totalWeeks))
  }
}
