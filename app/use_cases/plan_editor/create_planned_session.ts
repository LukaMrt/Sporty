import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { UnknownSportError } from '#domain/errors/unknown_sport_error'
import type { PlannedSession, PlannedSessionFields } from '#domain/entities/planned_session'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { estimatePlannedTss } from '#domain/services/planned_load'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

/** Ajoute une séance à une semaine du plan actif (tous sports, plusieurs par jour) */
@inject()
export default class CreatePlannedSession {
  constructor(
    private planRepository: TrainingPlanRepository,
    private sportRepository: SportRepository,
    private access: ActivePlanAccess
  ) {}

  async execute(
    userId: number,
    weekNumber: number,
    fields: PlannedSessionFields
  ): Promise<PlannedSession> {
    const plan = await this.access.plan(userId)
    await this.access.week(plan, weekNumber)
    const sports = await this.sportRepository.findAll()
    if (!sports.some((s) => s.slug === fields.sportSlug))
      throw new UnknownSportError(fields.sportSlug)

    const existing = await this.planRepository.findSessionsByPlanId(plan.id)
    const sameDay = existing.filter(
      (s) => s.weekNumber === weekNumber && s.dayOfWeek === fields.dayOfWeek
    )
    const session = await this.planRepository.createSession({
      ...fields,
      planId: plan.id,
      weekNumber,
      orderInDay: sameDay.length,
      targetLoadTss: estimatePlannedTss(fields),
      completedSessionId: null,
      status: PlannedSessionStatus.Pending,
    })
    await this.access.refresh(plan)
    return session
  }
}
