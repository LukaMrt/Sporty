import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

/** Supprime une séance du plan actif (la séance réalisée liée, elle, est conservée) */
@inject()
export default class DeletePlannedSession {
  constructor(
    private planRepository: TrainingPlanRepository,
    private access: ActivePlanAccess
  ) {}

  async execute(userId: number, sessionId: number): Promise<void> {
    const { plan } = await this.access.session(userId, sessionId)
    await this.planRepository.deleteSession(sessionId)
    await this.access.refresh(plan)
  }
}
