import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'

/**
 * Reprise après une inactivité prolongée (> 14 jours).
 * Réduit la charge des semaines restantes et estime un VDOT ajusté selon
 * la durée d'inactivité (table Hickson 1985).
 */
@inject()
export default class ResumeFromInactivity {
  constructor(
    private planRepository: TrainingPlanRepository,
    private goalRepository: TrainingGoalRepository,
    private planEngine: TrainingPlanEngine
  ) {}

  async execute(userId: number, daysSinceLastSession: number): Promise<void> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) return

    const reducedVdot = this.#estimateReducedVdot(plan.currentVdot, daysSinceLastSession)
    const loadFactor = this.#estimateLoadFactor(daysSinceLastSession)

    const allWeeks = await this.planRepository.findWeeksByPlanId(plan.id)
    const allSessions = await this.planRepository.findSessionsByPlanId(plan.id)

    // Semaine courante
    const start = new Date(plan.startDate)
    const now = new Date()
    const diffWeeks = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const currentWeekNumber = Math.max(1, Math.min(diffWeeks + 1, allWeeks.length))

    const nextWeekNumber = currentWeekNumber + 1
    const remainingWeeks = allWeeks.filter((w) => w.weekNumber >= nextWeekNumber)
    const remainingSessions = allSessions.filter((s) => s.weekNumber >= nextWeekNumber)

    if (remainingWeeks.length === 0) return

    const goal = plan.goalId ? await this.goalRepository.findById(plan.goalId) : null
    const paceZones = derivePaceZones(reducedVdot)

    const weeksForEngine: GeneratedWeek[] = remainingWeeks.map((w) => ({
      weekNumber: w.weekNumber,
      phaseName: w.phaseName,
      isRecoveryWeek: w.isRecoveryWeek,
      targetVolumeMinutes: Math.round(w.targetVolumeMinutes * loadFactor),
      sessions: remainingSessions
        .filter((s) => s.weekNumber === w.weekNumber)
        .map((s) => ({
          dayOfWeek: s.dayOfWeek,
          sessionType: s.sessionType,
          targetDurationMinutes: s.targetDurationMinutes,
          targetDistanceKm: s.targetDistanceKm,
          targetPacePerKm: s.targetPacePerKm,
          intensityZone: s.intensityZone,
          intervals: s.intervals,
        })),
    }))

    const recalibrationContext = {
      currentWeekNumber,
      newVdot: reducedVdot,
      newPaceZones: paceZones,
      remainingWeeks: weeksForEngine,
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
        currentWeeklyVolumeMinutes: Math.round(weeksForEngine[0]?.targetVolumeMinutes ?? 0),
      },
    }

    const recalibrated = this.planEngine.recalibrate(recalibrationContext)

    await this.planRepository.deleteSessionsFromWeek(plan.id, nextWeekNumber)

    for (const week of recalibrated.weeks.filter((w) => w.weekNumber >= nextWeekNumber)) {
      for (const session of week.sessions) {
        await this.planRepository.createSession({
          planId: plan.id,
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

    await this.planRepository.update(plan.id, {
      currentVdot: reducedVdot,
      lastRecalibratedAt: new Date().toISOString(),
      pendingVdotDown: null,
    })
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
