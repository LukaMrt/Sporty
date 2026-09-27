import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { WeekHasCompletedSessionsError } from '#domain/errors/week_has_completed_sessions_error'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

/**
 * Supprime une semaine et ses séances ; les semaines suivantes avancent d'un
 * cran. Refusé si la semaine contient des séances réalisées (liens perdus).
 */
@inject()
export default class DeletePlanWeek {
  constructor(
    private planRepository: TrainingPlanRepository,
    private unitOfWork: UnitOfWork,
    private access: ActivePlanAccess
  ) {}

  async execute(userId: number, weekNumber: number): Promise<void> {
    const plan = await this.access.plan(userId)
    await this.access.week(plan, weekNumber)
    const sessions = await this.planRepository.findSessionsByPlanId(plan.id)
    if (
      sessions.some(
        (s) => s.weekNumber === weekNumber && s.status === PlannedSessionStatus.Completed
      )
    ) {
      throw new WeekHasCompletedSessionsError(weekNumber)
    }
    await this.unitOfWork.run(async () => {
      await this.planRepository.deleteWeek(plan.id, weekNumber)
      await this.access.refresh(plan)
    })
  }
}
