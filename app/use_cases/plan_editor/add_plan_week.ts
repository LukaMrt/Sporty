import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import type { PlannedWeek } from '#domain/entities/planned_week'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

export type AddPlanWeekInput = {
  phaseLabel?: string | null
  notes?: string | null
  isRecoveryWeek?: boolean
  /** Duplique les séances d'une semaine existante (réinitialisées « à faire ») */
  copyFromWeek?: number | null
}

/** Ajoute une semaine à la fin du plan actif, vide ou copiée d'une autre */
@inject()
export default class AddPlanWeek {
  constructor(
    private planRepository: TrainingPlanRepository,
    private unitOfWork: UnitOfWork,
    private access: ActivePlanAccess
  ) {}

  async execute(userId: number, input: AddPlanWeekInput): Promise<PlannedWeek> {
    const plan = await this.access.plan(userId)
    return this.unitOfWork.run(async () => {
      const weeks = await this.planRepository.findWeeksByPlanId(plan.id)
      const source =
        input.copyFromWeek !== null && input.copyFromWeek !== undefined
          ? await this.access.week(plan, input.copyFromWeek)
          : null
      const weekNumber = weeks.length + 1
      const week = await this.planRepository.createWeek({
        planId: plan.id,
        weekNumber,
        phaseName: source?.phaseName ?? 'custom',
        phaseLabel: input.phaseLabel ?? source?.phaseLabel ?? '',
        isRecoveryWeek: input.isRecoveryWeek ?? source?.isRecoveryWeek ?? false,
        targetVolumeMinutes: 0,
        notes: input.notes ?? source?.notes ?? null,
      })
      if (source) {
        const all = await this.planRepository.findSessionsByPlanId(plan.id)
        const sessions = all.filter((s) => s.weekNumber === source.weekNumber)
        await this.planRepository.createSessions(
          sessions.map(({ id: _id, createdAt: _c, updatedAt: _u, ...s }) => ({
            ...s,
            weekNumber,
            completedSessionId: null,
            status: PlannedSessionStatus.Pending,
          }))
        )
      }
      await this.access.refresh(plan)
      return week
    })
  }
}
