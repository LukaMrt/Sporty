import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'

import { NoActivePlanError } from '#domain/errors/no_active_plan_error'

export { NoActivePlanError }

@inject()
export default class ToggleAutoRecalibrate {
  constructor(private planRepository: TrainingPlanRepository) {}

  async execute(userId: number): Promise<boolean> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) throw new NoActivePlanError()

    const newValue = !plan.autoRecalibrate
    await this.planRepository.update(plan.id, { autoRecalibrate: newValue })
    return newValue
  }
}
