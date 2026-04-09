import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { TrainingSession } from '#domain/entities/training_session'
import {
  PlanStatus,
  PlannedSessionStatus,
  TrainingState,
} from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'

export type InactivityLevel = 'none' | 'warning' | 'critical'

const INACTIVITY_WARNING_DAYS = 14
const INACTIVITY_CRITICAL_DAYS = 28
const MAINTENANCE_RATIO = 0.35

export interface PlanOverview {
  goal: TrainingGoal | null
  plan: TrainingPlan
  weeks: PlannedWeek[]
  currentWeekNumber: number
  sessionsByWeek: Record<number, PlannedSession[]>
  fitnessProfile: FitnessProfile | null
  inactivityLevel: InactivityLevel
  daysSinceLastSession: number | null
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addWeeks(dateIso: string, weeks: number): string {
  const d = new Date(dateIso)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

@inject()
export default class GetPlanOverview {
  constructor(
    private goalRepo: TrainingGoalRepository,
    private planRepo: TrainingPlanRepository,
    private sessionRepo: SessionRepository,
    private userProfileRepo: UserProfileRepository,
    private trainingLoadCalculator: TrainingLoadCalculator,
    private fitnessProfileCalculator: FitnessProfileCalculator,
    private planEngine: TrainingPlanEngine
  ) {}

  async execute(userId: number): Promise<PlanOverview | null> {
    let plan = await this.planRepo.findActiveByUserId(userId)
    if (!plan) return null

    const weeks = await this.planRepo.findWeeksByPlanId(plan.id)
    const currentWeekNumber = this.#computeCurrentWeek(plan.startDate, weeks.length)

    // Détection fin de plan
    if (todayIso() > plan.endDate || currentWeekNumber > weeks.length) {
      const profile = await this.userProfileRepo.findByUserId(userId)

      if (profile?.trainingState === TrainingState.Maintenance) {
        // Boucle maintenance : régénération automatique d'un nouveau cycle 4 semaines
        plan = await this.#regenerateMaintenanceCycle(userId, plan, weeks)
      } else {
        // Plan terminé → marquer comme complété, laisser GetPostPlanState gérer l'UI
        await this.planRepo.update(plan.id, { status: PlanStatus.Completed })
        return null
      }
    }

    const goal = await this.goalRepo.findActiveByUserId(userId)

    // Les plans de maintenance (goalId: null) fonctionnent sans objectif actif.
    // Les plans de préparation/transition (goalId: non-null) nécessitent un objectif actif.
    if (!goal && plan.goalId !== null) return null

    const freshWeeks = await this.planRepo.findWeeksByPlanId(plan.id)
    return this.#buildOverview(userId, plan, freshWeeks, goal)
  }

  async #buildOverview(
    userId: number,
    plan: TrainingPlan,
    weeks: PlannedWeek[],
    goal: TrainingGoal | null
  ): Promise<PlanOverview | null> {
    const sessions = await this.planRepo.findSessionsByPlanId(plan.id)
    const currentWeekNumber = this.#computeCurrentWeek(plan.startDate, weeks.length)

    const sessionsByWeek: Record<number, PlannedSession[]> = {}
    for (const session of sessions) {
      if (!sessionsByWeek[session.weekNumber]) {
        sessionsByWeek[session.weekNumber] = []
      }
      sessionsByWeek[session.weekNumber].push(session)
    }

    const allSessions = await this.sessionRepo.findByUserIdAndDateRange(
      userId,
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10)
    )

    const fitnessProfile = await this.#computeFitnessProfile(userId, allSessions)
    const { inactivityLevel, daysSinceLastSession } = this.#computeInactivity(allSessions)

    return {
      goal,
      plan,
      weeks,
      currentWeekNumber,
      sessionsByWeek,
      fitnessProfile,
      inactivityLevel,
      daysSinceLastSession,
    }
  }

  async #regenerateMaintenanceCycle(
    userId: number,
    completedPlan: TrainingPlan,
    completedWeeks: PlannedWeek[]
  ): Promise<TrainingPlan> {
    // Estimer le volume pic depuis le plan maintenance actuel
    const nonRecoveryWeeks = completedWeeks.filter((w) => !w.isRecoveryWeek)
    const maintenanceVolume =
      nonRecoveryWeeks.length > 0
        ? Math.max(...nonRecoveryWeeks.map((w) => w.targetVolumeMinutes))
        : completedWeeks.length > 0
          ? Math.max(...completedWeeks.map((w) => w.targetVolumeMinutes))
          : 70 // fallback ~200 min * 0.35
    const peakVolume = Math.round(maintenanceVolume / MAINTENANCE_RATIO)

    const paceZones = derivePaceZones(completedPlan.currentVdot)
    const generated = this.planEngine.generateMaintenancePlan({
      vdot: completedPlan.currentVdot,
      paceZones,
      sessionsPerWeek: completedPlan.sessionsPerWeek,
      preferredDays: completedPlan.preferredDays,
      currentWeeklyVolumeMinutes: peakVolume,
    })

    // Marquer l'ancien plan comme terminé
    await this.planRepo.update(completedPlan.id, { status: PlanStatus.Completed })

    const startDate = todayIso()
    const endDate = addWeeks(startDate, generated.totalWeeks)

    const newPlan = await this.planRepo.create({
      userId,
      goalId: null,
      methodology: generated.methodology,
      level: completedPlan.level,
      status: PlanStatus.Active,
      autoRecalibrate: false,
      vdotAtCreation: completedPlan.currentVdot,
      currentVdot: completedPlan.currentVdot,
      sessionsPerWeek: completedPlan.sessionsPerWeek,
      preferredDays: completedPlan.preferredDays,
      startDate,
      endDate,
      lastRecalibratedAt: null,
      pendingVdotDown: null,
    })

    for (const week of generated.weeks) {
      await this.planRepo.createWeek({
        planId: newPlan.id,
        weekNumber: week.weekNumber,
        phaseName: week.phaseName,
        phaseLabel: week.phaseName,
        isRecoveryWeek: week.isRecoveryWeek,
        targetVolumeMinutes: week.targetVolumeMinutes,
      })

      for (const session of week.sessions) {
        await this.planRepo.createSession({
          planId: newPlan.id,
          weekNumber: week.weekNumber,
          dayOfWeek: session.dayOfWeek,
          sessionType: session.sessionType,
          targetDurationMinutes: session.targetDurationMinutes,
          targetDistanceKm: session.targetDistanceKm,
          targetPacePerKm: session.targetPacePerKm,
          intensityZone: session.intensityZone,
          intervals: session.intervals,
          targetLoadTss: null,
          completedSessionId: null,
          status: PlannedSessionStatus.Pending,
        })
      }
    }

    return newPlan
  }

  #computeCurrentWeek(startDate: string, totalWeeks: number): number {
    const start = new Date(startDate)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(diffWeeks + 1, totalWeeks))
  }

  #computeInactivity(sessions: TrainingSession[]): {
    inactivityLevel: InactivityLevel
    daysSinceLastSession: number | null
  } {
    if (sessions.length === 0) return { inactivityLevel: 'none', daysSinceLastSession: null }

    const lastDate = sessions.reduce((max, s) => (s.date > max ? s.date : max), sessions[0].date)
    const daysSince = Math.floor(
      (Date.now() - new Date(lastDate).getTime()) / (24 * 60 * 60 * 1000)
    )

    let inactivityLevel: InactivityLevel = 'none'
    if (daysSince >= INACTIVITY_CRITICAL_DAYS) inactivityLevel = 'critical'
    else if (daysSince >= INACTIVITY_WARNING_DAYS) inactivityLevel = 'warning'

    return { inactivityLevel, daysSinceLastSession: daysSince }
  }

  async #computeFitnessProfile(
    userId: number,
    allSessions: TrainingSession[]
  ): Promise<FitnessProfile | null> {
    try {
      const profile = await this.userProfileRepo.findByUserId(userId)
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
