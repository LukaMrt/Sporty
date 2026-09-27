import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { PlannedWeek } from '#domain/entities/planned_week'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

export type UpdatePlanWeekInput = Partial<
  Pick<PlannedWeek, 'phaseLabel' | 'notes' | 'isRecoveryWeek'>
>

/** Modifie la phase, les consignes ou le statut « allégée » d'une semaine */
@inject()
export default class UpdatePlanWeek {
  constructor(
    private planRepository: TrainingPlanRepository,
    private access: ActivePlanAccess
  ) {}

  async execute(
    userId: number,
    weekNumber: number,
    input: UpdatePlanWeekInput
  ): Promise<PlannedWeek> {
    const plan = await this.access.plan(userId)
    const week = await this.access.week(plan, weekNumber)
    return this.planRepository.updateWeek(week.id, input)
  }
}
