import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'
import type { TrainingPlan } from '#domain/entities/training_plan'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { planTargetDistanceKm } from '#domain/services/plan_distance'
import PlanPersister from '#use_cases/planning/plan_persister'

export type RecalibrateRemainingInput = {
  plan: TrainingPlan
  /** Dernière semaine conservée telle quelle ; les suivantes sont régénérées */
  currentWeekNumber: number
  newVdot: number
  /** Facteur appliqué au volume des semaines restantes (1 = inchangé) */
  volumeFactor?: number
}

/**
 * Régénère les semaines restantes d'un plan (nouveau VDOT, volume ajusté).
 * Partagé par la recalibration automatique, la baisse de VDOT confirmée et la
 * reprise après inactivité. L'appelant fournit la transaction (UnitOfWork).
 */
@inject()
export default class PlanRecalibrator {
  constructor(
    private planRepository: TrainingPlanRepository,
    private goalRepository: TrainingGoalRepository,
    private planEngine: TrainingPlanEngine,
    private planPersister: PlanPersister
  ) {}

  /** Renvoie `false` s'il ne reste aucune semaine à régénérer */
  async recalibrateRemaining(input: RecalibrateRemainingInput): Promise<boolean> {
    const { plan, currentWeekNumber, newVdot } = input
    const volumeFactor = input.volumeFactor ?? 1
    const nextWeekNumber = currentWeekNumber + 1

    const [allWeeks, allSessions] = await Promise.all([
      this.planRepository.findWeeksByPlanId(plan.id),
      this.planRepository.findSessionsByPlanId(plan.id),
    ])

    const remainingWeeks: GeneratedWeek[] = allWeeks
      .filter((w) => w.weekNumber >= nextWeekNumber)
      .map((w) => ({
        weekNumber: w.weekNumber,
        phaseName: w.phaseName,
        isRecoveryWeek: w.isRecoveryWeek,
        targetVolumeMinutes: Math.round(w.targetVolumeMinutes * volumeFactor),
        sessions: allSessions
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

    if (remainingWeeks.length === 0) return false

    const goal = plan.goalId ? await this.goalRepository.findById(plan.goalId) : null
    const paceZones = derivePaceZones(newVdot)

    const recalibrated = this.planEngine.recalibrate({
      currentWeekNumber,
      newVdot,
      newPaceZones: paceZones,
      remainingWeeks,
      originalRequest: {
        targetDistanceKm: planTargetDistanceKm(plan, goal),
        targetTimeMinutes: goal?.targetTimeMinutes ?? null,
        eventDate: goal?.eventDate ?? null,
        vdot: newVdot,
        paceZones,
        totalWeeks: allWeeks.length,
        sessionsPerWeek: plan.sessionsPerWeek,
        preferredDays: plan.preferredDays,
        startDate: plan.startDate,
        currentWeeklyVolumeMinutes: remainingWeeks[0].targetVolumeMinutes,
      },
    })

    await this.planPersister.replaceSessionsFromWeek(plan.id, nextWeekNumber, recalibrated.weeks)
    await this.planRepository.update(plan.id, {
      currentVdot: newVdot,
      lastRecalibratedAt: new Date().toISOString(),
      pendingVdotDown: null,
    })
    return true
  }
}
