import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'

export class NoActivePlanError extends Error {
  constructor() {
    super('Aucun plan actif trouvé')
    this.name = 'NoActivePlanError'
  }
}

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
