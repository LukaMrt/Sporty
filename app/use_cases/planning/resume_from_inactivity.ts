import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { todayInTimezone } from '#domain/services/calendar'
import { currentPlanWeek } from '#domain/services/plan_calendar'
import PlanRecalibrator from '#use_cases/planning/plan_recalibrator'

/**
 * Reprise après une inactivité prolongée (> 14 jours).
 * Réduit la charge des semaines restantes et estime un VDOT ajusté selon
 * la durée d'inactivité (table Hickson 1985).
 */
@inject()
export default class ResumeFromInactivity {
  constructor(
    private planRepository: TrainingPlanRepository,
    private userProfileRepository: UserProfileRepository,
    private planRecalibrator: PlanRecalibrator,
    private unitOfWork: UnitOfWork
  ) {}

  async execute(userId: number, daysSinceLastSession: number): Promise<void> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) return

    const profile = await this.userProfileRepository.findByUserId(userId)
    const weeks = await this.planRepository.findWeeksByPlanId(plan.id)

    await this.unitOfWork.run(() =>
      this.planRecalibrator.recalibrateRemaining({
        plan,
        currentWeekNumber: currentPlanWeek(plan, weeks.length, todayInTimezone(profile?.timezone)),
        newVdot: this.#estimateReducedVdot(plan.currentVdot, daysSinceLastSession),
        volumeFactor: this.#estimateLoadFactor(daysSinceLastSession),
      })
    )
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
