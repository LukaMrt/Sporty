import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import { calculateVdot, derivePaceZones } from '#domain/services/vdot_calculator'
import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { TrainingSession } from '#domain/entities/training_session'

export interface QualitySessionSummary {
  sessionType: string
  actualTss: number
  plannedTss: number
}

export interface WeekSummary {
  weekNumber: number
  plannedLoadTss: number
  actualLoadTss: number
  qualitySessions: QualitySessionSummary[]
}

const DELTA_THRESHOLD_SILENT = 0.1 // ±10 %
const DELTA_THRESHOLD_VDOT = 0.2 // ±20 %
const CONSECUTIVE_UNDER_TARGET = 3

@inject()
export default class RecalibratePlan {
  constructor(
    private planRepository: TrainingPlanRepository,
    private sessionRepository: SessionRepository,
    private goalRepository: TrainingGoalRepository,
    private planEngine: TrainingPlanEngine,
    private eventEmitter: EventEmitter
  ) {}

  async execute(userId: number, weekSummary: WeekSummary): Promise<void> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan || !plan.autoRecalibrate) return

    const { weekNumber, plannedLoadTss, actualLoadTss, qualitySessions } = weekSummary

    // 1. Delta de charge
    const delta = plannedLoadTss > 0 ? (actualLoadTss - plannedLoadTss) / plannedLoadTss : 0

    // 2. < ±10 % → rien
    if (Math.abs(delta) < DELTA_THRESHOLD_SILENT) return

    // 3. Récupérer l'historique des 12 semaines pour analyses VDOT
    const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const recentSessions = await this.sessionRepository.findByUserIdAndDateRange(
      userId,
      twelveWeeksAgo,
      today
    )

    // 4. Identifier séances qualité sous cibles (3+ consécutives)
    const allPlannedSessions = await this.planRepository.findSessionsByPlanId(plan.id)
    const underTargetFlag = this.#detectConsecutiveUnderTarget(
      weekNumber,
      allPlannedSessions,
      recentSessions
    )

    let newVdot = plan.currentVdot
    let vdotChanged = false

    // 5a. > +20 % sur séances qualité → réévaluation VDOT à la hausse auto
    if (delta > DELTA_THRESHOLD_VDOT && qualitySessions.length > 0) {
      const bestPaceMs = this.#getBestQualityPace(recentSessions)
      if (bestPaceMs) {
        const estimatedVdot = calculateVdot(5000, 5000 / bestPaceMs)
        if (estimatedVdot > plan.currentVdot + 0.5) {
          newVdot = Math.round(estimatedVdot * 2) / 2 // arrondi au 0.5
          vdotChanged = true
        }
      }
    }

    // 5b. > -20 % → réduire la charge (sans changer VDOT)
    // 5c. 3+ séances qualité consécutives sous cibles → proposition baisse VDOT
    if (underTargetFlag && !vdotChanged) {
      // Créer une proposition de baisse VDOT (confirmation utilisateur requise)
      const proposedVdot = Math.max(plan.currentVdot - 2, 30)
      await this.planRepository.update(plan.id, { pendingVdotDown: proposedVdot })
      return
    }

    // 6. Préparer le contexte de recalibration
    const nextWeekNumber = weekNumber + 1
    const remainingSessions = allPlannedSessions.filter((s) => s.weekNumber >= nextWeekNumber)

    if (remainingSessions.length === 0) return

    // Construire les GeneratedWeek restantes pour le contexte
    const allWeeks = await this.planRepository.findWeeksByPlanId(plan.id)
    const remainingWeeks: GeneratedWeek[] = allWeeks
      .filter((w) => w.weekNumber >= nextWeekNumber)
      .map((w) => ({
        weekNumber: w.weekNumber,
        phaseName: w.phaseName,
        isRecoveryWeek: w.isRecoveryWeek,
        targetVolumeMinutes: w.targetVolumeMinutes,
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

    const goal = plan.goalId ? await this.goalRepository.findById(plan.goalId) : null
    const paceZones = derivePaceZones(newVdot)

    // Appliquer un facteur de charge si delta négatif (-10 à -20 %)
    const loadFactor = delta < -DELTA_THRESHOLD_VDOT ? 0.85 : 1.0

    const recalibrationContext = {
      currentWeekNumber: weekNumber,
      newVdot,
      newPaceZones: paceZones,
      remainingWeeks,
      originalRequest: {
        targetDistanceKm: goal?.targetDistanceKm ?? 42.195,
        targetTimeMinutes: goal?.targetTimeMinutes ?? null,
        eventDate: goal?.eventDate ?? null,
        vdot: newVdot,
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

    // 7. Recalibrer via le moteur
    const recalibrated = this.planEngine.recalibrate(recalibrationContext)

    // 8. Supprimer les sessions futures et les remplacer
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

    // 9. Persister les changements sur le plan
    await this.planRepository.update(plan.id, {
      currentVdot: newVdot,
      lastRecalibratedAt: new Date().toISOString(),
      pendingVdotDown: null,
    })

    // 10. Notifier hausse VDOT (toast via émission d'un événement)
    if (vdotChanged) {
      await this.eventEmitter.emit('plan:vdot_increased', {
        userId,
        planId: plan.id,
        oldVdot: plan.currentVdot,
        newVdot,
      })
    }
  }

  #detectConsecutiveUnderTarget(
    currentWeek: number,
    plannedSessions: PlannedSession[],
    recentSessions: TrainingSession[]
  ): boolean {
    const QUALITY_TYPES: string[] = [
      SessionType.Tempo,
      SessionType.Interval,
      SessionType.Repetition,
    ]
    const UNDER_TARGET_RATIO = 0.85

    const sessionById = new Map(recentSessions.map((s) => [s.id, s]))

    // Séances qualité complétées sur les 3 dernières semaines, triées chronologiquement
    const recentQuality = plannedSessions
      .filter(
        (ps) =>
          ps.weekNumber >= currentWeek - 2 &&
          ps.weekNumber <= currentWeek &&
          QUALITY_TYPES.includes(ps.sessionType) &&
          ps.status === PlannedSessionStatus.Completed
      )
      .sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek)

    if (recentQuality.length < CONSECUTIVE_UNDER_TARGET) return false

    // Vérifier que les 3 dernières séances qualité sont toutes sous cible
    const lastThree = recentQuality.slice(-CONSECUTIVE_UNDER_TARGET)
    return lastThree.every((ps) => {
      if (!ps.completedSessionId) return true
      const actual = sessionById.get(ps.completedSessionId)
      if (!actual || !ps.targetDurationMinutes) return true
      return actual.durationMinutes < ps.targetDurationMinutes * UNDER_TARGET_RATIO
    })
  }

  #getBestQualityPace(sessions: TrainingSession[]): number | null {
    // Trouver la meilleure allure (min/km → m/min) sur les séances récentes > 3km
    const runSessions = sessions.filter(
      (s) => s.distanceKm && s.distanceKm >= 3 && s.durationMinutes > 0
    )

    if (runSessions.length === 0) return null

    const paces = runSessions.map((s) => (s.distanceKm! * 1000) / s.durationMinutes)
    return Math.max(...paces)
  }
}
