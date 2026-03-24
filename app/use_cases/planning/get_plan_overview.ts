import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'

export interface PlanOverview {
  goal: TrainingGoal
  plan: TrainingPlan
  weeks: PlannedWeek[]
  currentWeekNumber: number
  sessionsByWeek: Record<number, PlannedSession[]>
  fitnessProfile: FitnessProfile | null
}

@inject()
export default class GetPlanOverview {
  constructor(
    private goalRepo: TrainingGoalRepository,
    private planRepo: TrainingPlanRepository,
    private sessionRepo: SessionRepository,
    private userProfileRepo: UserProfileRepository,
    private trainingLoadCalculator: TrainingLoadCalculator,
    private fitnessProfileCalculator: FitnessProfileCalculator
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

    const fitnessProfile = await this.#computeFitnessProfile(userId)

    return { goal, plan, weeks, currentWeekNumber, sessionsByWeek, fitnessProfile }
  }

  #computeCurrentWeek(startDate: string, totalWeeks: number): number {
    const start = new Date(startDate)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(diffWeeks + 1, totalWeeks))
  }

  async #computeFitnessProfile(userId: number): Promise<FitnessProfile | null> {
    try {
      const profile = await this.userProfileRepo.findByUserId(userId)
      const allSessions = await this.sessionRepo.findByUserIdAndDateRange(
        userId,
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        new Date().toISOString().slice(0, 10)
      )
      if (allSessions.length === 0) return null

      const loadHistory = allSessions.map((s) => ({
        date: s.date,
        load: this.trainingLoadCalculator.calculate({
          durationHours: s.durationMinutes / 60,
          perceivedEffort: s.perceivedEffort ?? undefined,
          avgPaceMPerMin:
            s.distanceKm && s.durationMinutes > 0
              ? (s.distanceKm * 1000) / s.durationMinutes
              : undefined,
          maxHR: profile?.maxHeartRate ?? undefined,
          restHR: profile?.restingHeartRate ?? undefined,
          sex: profile?.sex ?? undefined,
        }),
      }))

      return this.fitnessProfileCalculator.calculate(loadHistory)
    } catch {
      return null
    }
  }
}
