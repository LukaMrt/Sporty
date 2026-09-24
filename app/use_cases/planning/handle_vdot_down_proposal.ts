import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { NoActivePlanError } from '#domain/errors/no_active_plan_error'
import { todayInTimezone } from '#domain/services/calendar'
import { currentPlanWeek } from '#domain/services/plan_calendar'
import PlanRecalibrator from '#use_cases/planning/plan_recalibrator'

@inject()
export default class HandleVdotDownProposal {
  constructor(
    private planRepository: TrainingPlanRepository,
    private userProfileRepository: UserProfileRepository,
    private planRecalibrator: PlanRecalibrator,
    private unitOfWork: UnitOfWork
  ) {}

  async execute(userId: number, action: 'confirm' | 'dismiss'): Promise<void> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) throw new NoActivePlanError()

    // Pas de proposition pendante — on ignore silencieusement
    if (!plan.pendingVdotDown) return

    if (action === 'dismiss') {
      await this.planRepository.update(plan.id, { pendingVdotDown: null })
      return
    }

    // Confirmer : appliquer le nouveau VDOT aux semaines restantes
    const newVdot = plan.pendingVdotDown
    const profile = await this.userProfileRepository.findByUserId(userId)
    const weeks = await this.planRepository.findWeeksByPlanId(plan.id)

    await this.unitOfWork.run(async () => {
      const recalibrated = await this.planRecalibrator.recalibrateRemaining({
        plan,
        currentWeekNumber: currentPlanWeek(plan, weeks.length, todayInTimezone(profile?.timezone)),
        newVdot,
      })
      if (!recalibrated) {
        await this.planRepository.update(plan.id, {
          currentVdot: newVdot,
          lastRecalibratedAt: new Date().toISOString(),
          pendingVdotDown: null,
        })
      }
      await this.userProfileRepository.update(userId, { vdot: newVdot })
    })
  }
}
