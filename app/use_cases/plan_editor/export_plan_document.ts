import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { planToDocument, type PlanDocument } from '#domain/services/plan_document'

/** Plan actif au format document (export JSON, révision par Claude) ; null sans plan actif */
@inject()
export default class ExportPlanDocument {
  constructor(
    private planRepository: TrainingPlanRepository,
    private goalRepository: TrainingGoalRepository
  ) {}

  async execute(userId: number): Promise<PlanDocument | null> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) return null
    const [weeks, sessions, goal] = await Promise.all([
      this.planRepository.findWeeksByPlanId(plan.id),
      this.planRepository.findSessionsByPlanId(plan.id),
      plan.goalId ? this.goalRepository.findById(plan.goalId) : Promise.resolve(null),
    ])
    return planToDocument({ plan, goal, weeks, sessions })
  }
}
