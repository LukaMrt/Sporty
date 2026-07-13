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

    return Promise.all(
      archivedPlans.map(async (plan): Promise<PlanHistoryEntry> => {
        const [weeks, sessions, goal] = await Promise.all([
          this.planRepo.findWeeksByPlanId(plan.id),
          this.planRepo.findSessionsByPlanId(plan.id),
          plan.goalId ? this.goalRepo.findById(plan.goalId) : Promise.resolve(null),
        ])

        const runningSessions = sessions.filter((s) => s.sessionType !== SessionType.Rest)
        const completedSessionsCount = runningSessions.filter(
          (s) => s.status === PlannedSessionStatus.Completed
        ).length

        return {
          plan,
          weeks,
          sessions,
          goalDistanceKm: goal?.targetDistanceKm ?? null,
          completedSessionsCount,
          totalSessionsCount: runningSessions.length,
        }
      })
    )
  }
}
