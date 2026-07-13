import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import {
  PlannedSessionStatus,
  SessionType,
  QUALITY_SESSION_TYPES,
} from '#domain/value_objects/planning_types'
import { calculateVdot, derivePaceZones } from '#domain/services/vdot_calculator'
import {
  WEEK_DAY_ORDER,
  chronologicalDayIndex,
  plannedSessionDate,
  todayIso,
} from '#domain/services/plan_calendar'
import { toGeneratedWeeks } from '#domain/services/plan_mapper'
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

    const { weekNumber, plannedLoadTss, actualLoadTss } = weekSummary

    // 0. Charger les séances planifiées (utilisées à plusieurs étapes)
    const allPlannedSessions = await this.planRepository.findSessionsByPlanId(plan.id)

    // Reporter une séance qualité manquée (max 1)
    await this.#deferMissedQualitySession(weekNumber, plan.startDate, allPlannedSessions)

    // 1. Delta de charge
    const delta = plannedLoadTss > 0 ? (actualLoadTss - plannedLoadTss) / plannedLoadTss : 0

    // 2. < ±10 % → rien
    if (Math.abs(delta) < DELTA_THRESHOLD_SILENT) return

    // 3. Récupérer l'historique des 12 semaines pour analyses VDOT
    const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const recentSessions = await this.sessionRepository.findByUserIdAndDateRange(
      userId,
      twelveWeeksAgo,
      todayIso()
    )

    // 4. Identifier séances qualité sous cibles (3+ consécutives)
    const underTargetFlag = this.#detectConsecutiveUnderTarget(
      weekNumber,
      allPlannedSessions,
      recentSessions
    )

    let newVdot = plan.currentVdot
    let vdotChanged = false

    // 5a. > +20 % → réévaluation VDOT à la hausse depuis les séances qualité
    // réellement complétées (jamais depuis un footing : l'allure moyenne d'une
    // séance easy n'est pas une performance)
    if (delta > DELTA_THRESHOLD_VDOT) {
      const estimatedVdot = this.#estimateVdotFromCompletedQuality(
        allPlannedSessions,
        recentSessions
      )
      if (estimatedVdot && estimatedVdot > plan.currentVdot + 0.5) {
        newVdot = Math.round(estimatedVdot * 2) / 2 // arrondi au 0.5
        vdotChanged = true
      }
    }

    // 5b. Delta négatif + 3+ séances qualité consécutives sous cibles →
    // proposition baisse VDOT (confirmation utilisateur requise)
    if (delta < 0 && underTargetFlag && !vdotChanged) {
      const proposedVdot = Math.max(plan.currentVdot - 2, 30)
      await this.planRepository.update(plan.id, { pendingVdotDown: proposedVdot })
      return
    }

    // 5c. Delta négatif au-delà de -10 % → réduction de charge sur la suite
    const loadFactor = delta < -DELTA_THRESHOLD_SILENT ? 0.85 : 1.0

    // Si ni le VDOT ni la charge ne changent, régénérer serait un no-op
    // destructeur (perte des ajustements manuels) → on s'arrête là.
    if (!vdotChanged && loadFactor === 1.0) return

    // 6. Préparer le contexte de recalibration
    const nextWeekNumber = weekNumber + 1
    const allWeeks = await this.planRepository.findWeeksByPlanId(plan.id)
    const remainingWeeks = toGeneratedWeeks(allWeeks, allPlannedSessions, nextWeekNumber)

    if (remainingWeeks.length === 0) return

    const goal = plan.goalId ? await this.goalRepository.findById(plan.goalId) : null
    const paceZones = derivePaceZones(newVdot)

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

    // 8. Remplacer atomiquement les semaines restantes (séances + volumes)
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
    const UNDER_TARGET_RATIO = 0.85

    const sessionById = new Map(recentSessions.map((s) => [s.id, s]))

    // Séances qualité complétées sur les 3 dernières semaines, triées chronologiquement
    const recentQuality = plannedSessions
      .filter(
        (ps) =>
          ps.weekNumber >= currentWeek - 2 &&
          ps.weekNumber <= currentWeek &&
          QUALITY_SESSION_TYPES.includes(ps.sessionType) &&
          ps.status === PlannedSessionStatus.Completed
      )
      .sort(
        (a, b) =>
          a.weekNumber - b.weekNumber ||
          chronologicalDayIndex(a.dayOfWeek) - chronologicalDayIndex(b.dayOfWeek)
      )

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

  async #deferMissedQualitySession(
    currentWeek: number,
    planStartDate: string,
    allPlannedSessions: PlannedSession[]
  ): Promise<void> {
    const today = new Date()
    const lastWeekNumber = Math.max(0, ...allPlannedSessions.map((s) => s.weekNumber))

    // Pas de report au-delà de la dernière semaine du plan
    if (currentWeek + 1 > lastWeekNumber) return

    // Séances qualité de la semaine courante encore en attente et dont la date est passée
    const missedQuality = allPlannedSessions.filter(
      (s) =>
        s.weekNumber === currentWeek &&
        QUALITY_SESSION_TYPES.includes(s.sessionType) &&
        s.status === PlannedSessionStatus.Pending &&
        plannedSessionDate(planStartDate, s.weekNumber, s.dayOfWeek) < today
    )

    if (missedQuality.length === 0) return

    // Prendre la première séance manquée (max 1)
    const toDefer = missedQuality[0]

    const nextWeekSessions = allPlannedSessions.filter((s) => s.weekNumber === currentWeek + 1)

    // Ne pas surcharger la semaine suivante : max 2 séances qualité au total
    const nextWeekQualityCount = nextWeekSessions.filter((s) =>
      QUALITY_SESSION_TYPES.includes(s.sessionType)
    ).length
    if (nextWeekQualityCount >= 2) return

    // Créneau libre en privilégiant un jour sans séance intense adjacente
    const occupiedDays = new Set(nextWeekSessions.map((s) => s.dayOfWeek))
    const hardDays = new Set(
      nextWeekSessions
        .filter(
          (s) =>
            QUALITY_SESSION_TYPES.includes(s.sessionType) || s.sessionType === SessionType.LongRun
        )
        .map((s) => chronologicalDayIndex(s.dayOfWeek))
    )
    const freeDays = WEEK_DAY_ORDER.filter((d) => !occupiedDays.has(d))
    if (freeDays.length === 0) return // Pas de créneau libre

    const isolatedDay = freeDays.find((d) => {
      const idx = chronologicalDayIndex(d)
      return !hardDays.has(idx - 1) && !hardDays.has(idx + 1)
    })

    await this.planRepository.updateSession(toDefer.id, {
      weekNumber: currentWeek + 1,
      dayOfWeek: isolatedDay ?? freeDays[0],
    })
  }

  // Meilleur VDOT observé sur les séances réalisées liées à une séance qualité
  // complétée du plan (distance réelle, pas d'extrapolation à 5 km).
  #estimateVdotFromCompletedQuality(
    plannedSessions: PlannedSession[],
    recentSessions: TrainingSession[]
  ): number | null {
    const qualityLinkedIds = new Set(
      plannedSessions
        .filter(
          (ps) =>
            QUALITY_SESSION_TYPES.includes(ps.sessionType) &&
            ps.status === PlannedSessionStatus.Completed &&
            ps.completedSessionId !== null
        )
        .map((ps) => ps.completedSessionId as number)
    )

    const eligible = recentSessions.filter(
      (s) =>
        qualityLinkedIds.has(s.id) &&
        s.distanceKm !== null &&
        s.distanceKm >= 3 &&
        s.durationMinutes > 0
    )
    if (eligible.length === 0) return null

    const vdots = eligible.map((s) => calculateVdot(s.distanceKm! * 1000, s.durationMinutes))
    return Math.max(...vdots)
  }
}
