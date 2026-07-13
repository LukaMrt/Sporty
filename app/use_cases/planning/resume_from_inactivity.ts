import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { computeCurrentWeekNumber, daysBetween, todayIso } from '#domain/services/plan_calendar'
import { toGeneratedWeeks } from '#domain/services/plan_mapper'

const MIN_INACTIVITY_DAYS = 14

/**
 * Reprise après une inactivité prolongée (> 14 jours).
 * Réduit la charge des semaines restantes et estime un VDOT ajusté selon
 * la durée d'inactivité (table Hickson 1985).
 *
 * La durée d'inactivité est calculée côté serveur depuis l'historique des
 * séances — jamais depuis une valeur fournie par le client.
 */
@inject()
export default class ResumeFromInactivity {
  constructor(
    private planRepository: TrainingPlanRepository,
    private goalRepository: TrainingGoalRepository,
    private sessionRepository: SessionRepository,
    private planEngine: TrainingPlanEngine
  ) {}

  async execute(userId: number): Promise<void> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) return

    const daysSinceLastSession = await this.#computeDaysSinceLastSession(userId)
    if (daysSinceLastSession === null || daysSinceLastSession < MIN_INACTIVITY_DAYS) return

    // Idempotence : si une recalibration a déjà eu lieu depuis la dernière
    // séance, la reprise a déjà été traitée — rejouer la requête ne doit pas
    // réduire le VDOT une seconde fois.
    if (plan.lastRecalibratedAt) {
      const lastSessionAgo = daysSinceLastSession
      const recalibratedAgo = daysBetween(plan.lastRecalibratedAt.slice(0, 10), todayIso())
      if (recalibratedAgo <= lastSessionAgo) return
    }

    const reducedVdot = this.#estimateReducedVdot(plan.currentVdot, daysSinceLastSession)
    const loadFactor = this.#estimateLoadFactor(daysSinceLastSession)

    const allWeeks = await this.planRepository.findWeeksByPlanId(plan.id)
    const allSessions = await this.planRepository.findSessionsByPlanId(plan.id)

    const currentWeekNumber = computeCurrentWeekNumber(plan.startDate, allWeeks.length)
    const nextWeekNumber = currentWeekNumber + 1
    const remainingWeeks = toGeneratedWeeks(allWeeks, allSessions, nextWeekNumber)

    if (remainingWeeks.length === 0) return

    const goal = plan.goalId ? await this.goalRepository.findById(plan.goalId) : null
    const paceZones = derivePaceZones(reducedVdot)

    const recalibrationContext = {
      currentWeekNumber,
      newVdot: reducedVdot,
      newPaceZones: paceZones,
      remainingWeeks,
      originalRequest: {
        targetDistanceKm: goal?.targetDistanceKm ?? 42.195,
        targetTimeMinutes: goal?.targetTimeMinutes ?? null,
        eventDate: goal?.eventDate ?? null,
        vdot: reducedVdot,
        paceZones,
        totalWeeks: allWeeks.length,
        sessionsPerWeek: plan.sessionsPerWeek,
        preferredDays: plan.preferredDays,
        startDate: plan.startDate,
        currentWeeklyVolumeMinutes: Math.round(
          (remainingWeeks[0]?.targetVolumeMinutes ?? 0) * loadFactor
        ),
      },
    }

    const recalibrated = this.planEngine.recalibrate(recalibrationContext)

    await this.planRepository.replaceFromWeek(
      plan.id,
      nextWeekNumber,
      recalibrated.weeks
        .filter((w) => w.weekNumber >= nextWeekNumber)
        .map((week) => ({
          weekNumber: week.weekNumber,
          isRecoveryWeek: week.isRecoveryWeek,
          targetVolumeMinutes: week.targetVolumeMinutes,
          sessions: week.sessions.map((session) => ({
            weekNumber: week.weekNumber,
            dayOfWeek: session.dayOfWeek,
            sessionType: session.sessionType,
            targetDurationMinutes: session.targetDurationMinutes,
            targetDistanceKm: session.targetDistanceKm,
            targetPacePerKm: session.targetPacePerKm,
            intensityZone: session.intensityZone,
            intervals: session.intervals,
            targetLoadTss: session.targetLoadTss,
            completedSessionId: null,
            status: PlannedSessionStatus.Pending,
          })),
        }))
    )

    await this.planRepository.update(plan.id, {
      currentVdot: reducedVdot,
      lastRecalibratedAt: new Date().toISOString(),
      pendingVdotDown: null,
    })
  }

  async #computeDaysSinceLastSession(userId: number): Promise<number | null> {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const sessions = await this.sessionRepository.findByUserIdAndDateRange(
      userId,
      oneYearAgo,
      todayIso()
    )
    if (sessions.length === 0) return null

    const lastDate = sessions.reduce((max, s) => (s.date > max ? s.date : max), sessions[0].date)
    return daysBetween(lastDate.slice(0, 10), todayIso())
  }

  /**
   * Estime la réduction de VDOT selon la durée d'inactivité.
   * Source : Hickson et al. (1985)
   * - 14 jours → ~3% de perte
   * - 28 jours → ~7% de perte
   * - 56 jours → ~15% de perte
   */
  #estimateReducedVdot(currentVdot: number, days: number): number {
    let lossPercent: number
    if (days <= 14) {
      lossPercent = 0.03
    } else if (days <= 28) {
      // Interpolation 3%→7% entre 14j et 28j
      lossPercent = 0.03 + ((days - 14) / 14) * 0.04
    } else if (days <= 56) {
      // Interpolation 7%→15% entre 28j et 56j
      lossPercent = 0.07 + ((days - 28) / 28) * 0.08
    } else {
      lossPercent = 0.15
    }

    const reduced = currentVdot * (1 - lossPercent)
    return Math.max(Math.round(reduced * 2) / 2, 30) // arrondi au 0.5, minimum 30
  }

  /**
   * Facteur de charge pour la reprise (volume réduit progressivement).
   */
  #estimateLoadFactor(days: number): number {
    if (days >= 56) return 0.6
    if (days >= 28) return 0.7
    if (days >= 14) return 0.8
    return 1.0
  }
}
