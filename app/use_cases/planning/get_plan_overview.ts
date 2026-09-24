import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import { addDaysIso, daysBetween, todayInTimezone } from '#domain/services/calendar'
import { currentPlanWeek } from '#domain/services/plan_calendar'
import { plannedSessionDate } from '#domain/services/planned_session_date'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'

export type InactivityLevel = 'none' | 'warning' | 'critical'

const INACTIVITY_WARNING_DAYS = 14
const INACTIVITY_CRITICAL_DAYS = 28

/** Séance planifiée avec sa date calculée (le frontend n'a plus à la recalculer) */
export type PlannedSessionView = PlannedSession & { date: string }

export type PlanOverview = {
  goal: TrainingGoal | null
  plan: TrainingPlan
  weeks: PlannedWeek[]
  currentWeekNumber: number
  sessionsByWeek: Record<number, PlannedSessionView[]>
  fitnessProfile: FitnessProfile | null
  inactivityLevel: InactivityLevel
  daysSinceLastSession: number | null
}

/**
 * Lecture seule du plan actif. Les transitions d'état (fin de plan, nouveau
 * cycle de maintenance, clôture des semaines) sont faites par
 * `AdvancePlanLifecycle` : un GET ne modifie plus rien.
 */
@inject()
export default class GetPlanOverview {
  constructor(
    private goalRepo: TrainingGoalRepository,
    private planRepo: TrainingPlanRepository,
    private sessionRepo: SessionRepository,
    private userProfileRepo: UserProfileRepository,
    private getFitnessProfile: GetFitnessProfile
  ) {}

  async execute(userId: number): Promise<PlanOverview | null> {
    const plan = await this.planRepo.findActiveByUserId(userId)
    if (!plan) return null

    const goal = await this.goalRepo.findActiveByUserId(userId)
    // Les plans de maintenance (goalId: null) fonctionnent sans objectif actif.
    // Les plans de préparation/transition (goalId: non-null) nécessitent un objectif actif.
    if (!goal && plan.goalId !== null) return null

    const profile = await this.userProfileRepo.findByUserId(userId)
    const today = todayInTimezone(profile?.timezone)

    const [weeks, sessions, fitness, recent] = await Promise.all([
      this.planRepo.findWeeksByPlanId(plan.id),
      this.planRepo.findSessionsByPlanId(plan.id),
      this.getFitnessProfile.execute(userId, { asOf: today }),
      this.sessionRepo.findLoadEntries(userId, addDaysIso(today, -365), today),
    ])

    const sessionsByWeek: Record<number, PlannedSessionView[]> = {}
    for (const session of sessions) {
      ;(sessionsByWeek[session.weekNumber] ??= []).push({
        ...session,
        date: plannedSessionDate(plan.startDate, session.weekNumber, session.dayOfWeek),
      })
    }

    const lastDate = recent.length > 0 ? recent[recent.length - 1].date : null
    const daysSinceLastSession = lastDate ? daysBetween(lastDate, today) : null
    let inactivityLevel: InactivityLevel = 'none'
    if (daysSinceLastSession !== null) {
      if (daysSinceLastSession >= INACTIVITY_CRITICAL_DAYS) inactivityLevel = 'critical'
      else if (daysSinceLastSession >= INACTIVITY_WARNING_DAYS) inactivityLevel = 'warning'
    }

    return {
      goal,
      plan,
      weeks,
      currentWeekNumber: currentPlanWeek(plan, weeks.length, today),
      sessionsByWeek,
      fitnessProfile: fitness.profile,
      inactivityLevel,
      daysSinceLastSession,
    }
  }
}
