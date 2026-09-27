import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { UnknownSportError } from '#domain/errors/unknown_sport_error'
import type { PlannedSession, PlannedSessionFields } from '#domain/entities/planned_session'
import { estimatePlannedTss } from '#domain/services/planned_load'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

/** Modifie une séance du plan actif (tous les champs, y compris sport, blocs et exercices) */
@inject()
export default class UpdatePlannedSession {
  constructor(
    private planRepository: TrainingPlanRepository,
    private sportRepository: SportRepository,
    private access: ActivePlanAccess
  ) {}

  async execute(
    userId: number,
    sessionId: number,
    fields: Partial<PlannedSessionFields>
  ): Promise<PlannedSession> {
    const { plan, session } = await this.access.session(userId, sessionId)
    if (fields.sportSlug !== undefined) {
      const sports = await this.sportRepository.findAll()
      if (!sports.some((s) => s.slug === fields.sportSlug)) {
        throw new UnknownSportError(fields.sportSlug)
      }
    }

    const next = { ...session, ...fields }
    const updates: Partial<PlannedSession> = { ...fields, targetLoadTss: estimatePlannedTss(next) }
    // Changement de jour : la séance passe après celles déjà prévues ce jour-là
    if (fields.dayOfWeek !== undefined && fields.dayOfWeek !== session.dayOfWeek) {
      const planSessions = await this.planRepository.findSessionsByPlanId(plan.id)
      updates.orderInDay = planSessions.filter(
        (s) => s.weekNumber === session.weekNumber && s.dayOfWeek === fields.dayOfWeek
      ).length
    }
    const updated = await this.planRepository.updateSession(sessionId, updates)
    await this.access.refresh(plan)
    return updated
  }
}
