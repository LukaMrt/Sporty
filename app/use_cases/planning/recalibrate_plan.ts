import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { calculateVdot } from '#domain/services/vdot_calculator'
import { RUNNING_SLUG } from '#domain/services/session_load'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { TrainingSession } from '#domain/entities/training_session'
import type { WeekSummary } from '#domain/value_objects/week_summary'
import PlanRecalibrator from '#use_cases/planning/plan_recalibrator'
import { QUALITY_SESSION_TYPES } from '#use_cases/planning/week_summary_builder'

export type { WeekSummary, QualitySessionSummary } from '#domain/value_objects/week_summary'

const DELTA_THRESHOLD_SILENT = 0.1 // ±10 %
const DELTA_THRESHOLD_VDOT = 0.2 // ±20 %
const CONSECUTIVE_UNDER_TARGET = 3
const UNDER_TARGET_RATIO = 0.85
/** Distance minimale d'une séance qualité pour estimer un VDOT fiable */
const MIN_VDOT_DISTANCE_KM = 3
/** Fenêtre (semaines) des séances qualité prises en compte pour la hausse de VDOT */
const VDOT_LOOKBACK_WEEKS = 4

@inject()
export default class RecalibratePlan {
  constructor(
    private planRepository: TrainingPlanRepository,
    private sessionRepository: SessionRepository,
    private planRecalibrator: PlanRecalibrator,
    private unitOfWork: UnitOfWork,
    private eventEmitter: EventEmitter
  ) {}

  async execute(userId: number, weekSummary: WeekSummary): Promise<void> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan || !plan.autoRecalibrate) return

    const { weekNumber, plannedLoadTss, actualLoadTss, qualitySessions } = weekSummary
    const allPlannedSessions = await this.planRepository.findSessionsByPlanId(plan.id)

    // Reporter une séance qualité manquée de la semaine close (max 1)
    await this.#deferMissedQualitySession(weekNumber, allPlannedSessions)

    // 1. Delta de charge
    const delta = plannedLoadTss > 0 ? (actualLoadTss - plannedLoadTss) / plannedLoadTss : 0

    // 2. < ±10 % → rien
    if (Math.abs(delta) < DELTA_THRESHOLD_SILENT) return

    // Séances réalisées liées aux séances qualité récentes (seules comparables aux cibles)
    const recentQuality = allPlannedSessions.filter(
      (ps) =>
        ps.weekNumber > weekNumber - VDOT_LOOKBACK_WEEKS &&
        ps.weekNumber <= weekNumber &&
        QUALITY_SESSION_TYPES.includes(ps.sessionType) &&
        ps.status === PlannedSessionStatus.Completed &&
        ps.completedSessionId !== null
    )
    const linkedSessions = await this.sessionRepository.findByIds(
      recentQuality.map((ps) => ps.completedSessionId!)
    )

    // 3. 3+ séances qualité consécutives sous cibles → proposition de baisse
    const underTarget = this.#detectConsecutiveUnderTarget(recentQuality, linkedSessions)

    let newVdot = plan.currentVdot
    let vdotChanged = false

    // 4. > +20 % avec séances qualité → réévaluation VDOT à la hausse
    if (delta > DELTA_THRESHOLD_VDOT && qualitySessions.length > 0) {
      const estimated = this.#bestQualityVdot(linkedSessions)
      if (estimated !== null && estimated > plan.currentVdot + 0.5) {
        newVdot = Math.round(estimated * 2) / 2 // arrondi au 0.5
        vdotChanged = true
      }
    }

    // 5. Proposition de baisse VDOT (confirmation utilisateur requise)
    if (underTarget && !vdotChanged) {
      await this.planRepository.update(plan.id, {
        pendingVdotDown: Math.max(plan.currentVdot - 2, 30),
      })
      return
    }

    // 6. Charge nettement inférieure au prévu (delta < −20 %) → volume réduit de 15 %,
    //    VDOT inchangé. Entre −10 % et −20 % : régénération sans réduction de volume.
    const volumeFactor = delta < -DELTA_THRESHOLD_VDOT ? 0.85 : 1.0

    const recalibrated = await this.unitOfWork.run(() =>
      this.planRecalibrator.recalibrateRemaining({
        plan,
        currentWeekNumber: weekNumber,
        newVdot,
        volumeFactor,
      })
    )

    // 7. Notifier la hausse de VDOT
    if (recalibrated && vdotChanged) {
      await this.eventEmitter.emit('plan:vdot_increased', {
        userId,
        planId: plan.id,
        oldVdot: plan.currentVdot,
        newVdot,
      })
    }
  }

  #detectConsecutiveUnderTarget(
    recentQuality: PlannedSession[],
    linkedSessions: TrainingSession[]
  ): boolean {
    const sessionById = new Map(linkedSessions.map((s) => [s.id, s]))
    const sorted = [...recentQuality].sort(
      (a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek
    )
    if (sorted.length < CONSECUTIVE_UNDER_TARGET) return false

    return sorted.slice(-CONSECUTIVE_UNDER_TARGET).every((ps) => {
      const actual = ps.completedSessionId ? sessionById.get(ps.completedSessionId) : undefined
      if (!actual || !ps.targetDurationMinutes) return true
      return actual.durationMinutes < ps.targetDurationMinutes * UNDER_TARGET_RATIO
    })
  }

  /**
   * Séance qualité de la semaine close restée non faite (`skipped` par la
   * clôture de semaine) : on la reporte sur un jour libre de la semaine suivante.
   */
  async #deferMissedQualitySession(
    closedWeek: number,
    allPlannedSessions: PlannedSession[]
  ): Promise<void> {
    const missed = allPlannedSessions.find(
      (s) =>
        s.weekNumber === closedWeek &&
        QUALITY_SESSION_TYPES.includes(s.sessionType) &&
        s.status === PlannedSessionStatus.Skipped
    )
    if (!missed) return

    const nextWeekSessions = allPlannedSessions.filter((s) => s.weekNumber === closedWeek + 1)
    if (nextWeekSessions.length === 0) return // dernière semaine du plan

    const occupiedDays = new Set(nextWeekSessions.map((s) => s.dayOfWeek))
    const freeDay = [1, 2, 3, 4, 5, 6, 0].find((d) => !occupiedDays.has(d)) // Lun–Dim
    if (freeDay === undefined) return

    await this.planRepository.updateSession(missed.id, {
      weekNumber: closedWeek + 1,
      dayOfWeek: freeDay,
      status: PlannedSessionStatus.Pending,
    })
  }

  /**
   * VDOT le plus élevé parmi les séances qualité de COURSE réellement liées au plan.
   * Chaque séance est évaluée sur sa propre distance (et non comme un 5 km), et
   * les autres sports sont exclus : une sortie vélo donnait un VDOT de 85+.
   */
  #bestQualityVdot(sessions: TrainingSession[]): number | null {
    const vdots = sessions
      .filter((s) => s.sportSlug === undefined || s.sportSlug === RUNNING_SLUG)
      .filter((s) => (s.distanceKm ?? 0) >= MIN_VDOT_DISTANCE_KM && s.durationMinutes > 0)
      .map((s) => calculateVdot(s.distanceKm! * 1000, s.durationMinutes))
      .filter((v) => Number.isFinite(v))
    return vdots.length > 0 ? Math.max(...vdots) : null
  }
}
