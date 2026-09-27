import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { TrainingPlan } from '#domain/entities/training_plan'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

/** Renomme le plan actif ou modifie ses consignes générales */
@inject()
export default class UpdatePlanInfo {
  constructor(
    private planRepository: TrainingPlanRepository,
    private access: ActivePlanAccess
  ) {}

  async execute(
    userId: number,
    input: Partial<Pick<TrainingPlan, 'name' | 'notes'>>
  ): Promise<TrainingPlan> {
    const plan = await this.access.plan(userId)
    return this.planRepository.update(plan.id, input)
  }
}
