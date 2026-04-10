import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import { PlanStatus, PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'

export interface PlanHistoryEntry {
  plan: TrainingPlan
  weeks: PlannedWeek[]
  sessions: PlannedSession[]
  goalDistanceKm: number | null
  completedSessionsCount: number
  totalSessionsCount: number
}

@inject()
export default class GetPlanHistory {
  constructor(
    private planRepo: TrainingPlanRepository,
    private goalRepo: TrainingGoalRepository
  ) {}

  async execute(userId: number): Promise<PlanHistoryEntry[]> {
    const allPlans = await this.planRepo.findByUserId(userId)
    const archivedPlans = allPlans
      .filter((p) => p.status === PlanStatus.Completed || p.status === PlanStatus.Abandoned)
      .sort((a, b) => b.endDate.localeCompare(a.endDate))

    const entries: PlanHistoryEntry[] = []

    for (const plan of archivedPlans) {
      const [weeks, sessions] = await Promise.all([
        this.planRepo.findWeeksByPlanId(plan.id),
        this.planRepo.findSessionsByPlanId(plan.id),
      ])

      const runningSessions = sessions.filter((s) => s.sessionType !== SessionType.Rest)
      const completedSessionsCount = runningSessions.filter(
        (s) => s.status === PlannedSessionStatus.Completed
      ).length
      const totalSessionsCount = runningSessions.length

      let goalDistanceKm: number | null = null
      if (plan.goalId) {
        const goal = await this.goalRepo.findById(plan.goalId)
        goalDistanceKm = goal?.targetDistanceKm ?? null
      }

      entries.push({
        plan,
        weeks,
        sessions,
        goalDistanceKm,
        completedSessionsCount,
        totalSessionsCount,
      })
    }

    return entries
  }
}
