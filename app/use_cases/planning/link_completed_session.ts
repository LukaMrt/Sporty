import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import type { PlannedSession } from '#domain/entities/planned_session'

export interface LinkCompletedSessionInput {
  userId: number
  plannedSessionId: number
  completedSessionId: number
}

@inject()
export default class LinkCompletedSession {
  constructor(
    private planRepository: TrainingPlanRepository,
    private sessionRepository: SessionRepository
  ) {}

  async execute(input: LinkCompletedSessionInput): Promise<PlannedSession> {
    // 1. Vérifier que la séance planifiée existe
    const plannedSession = await this.planRepository.findSessionById(input.plannedSessionId)
    if (!plannedSession) throw new PlannedSessionNotFoundError(input.plannedSessionId)

    // 2. Vérifier ownership via le plan actif
    const activePlan = await this.planRepository.findActiveByUserId(input.userId)
    if (!activePlan || activePlan.id !== plannedSession.planId) {
      throw new PlannedSessionForbiddenError()
    }

    // 3. Vérifier que la séance réalisée existe et appartient à l'utilisateur
    const completedSession = await this.sessionRepository.findById(input.completedSessionId)
    if (!completedSession || completedSession.userId !== input.userId) {
      throw new SessionNotFoundError(input.completedSessionId)
    }

    // 4. Lier et passer le statut à 'completed'
    const updated = await this.planRepository.updateSession(input.plannedSessionId, {
      completedSessionId: input.completedSessionId,
      status: PlannedSessionStatus.Completed,
    })

    // 5. Émettre session:completed pour déclencher la mise à jour fitness + détection week:completed
    await emitter.emit('session:completed', {
      sessionId: input.completedSessionId,
      userId: input.userId,
    })

    return updated
  }
}
