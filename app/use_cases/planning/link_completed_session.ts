import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionAlreadyLinkedError } from '#domain/errors/session_already_linked_error'
import { SessionDateMismatchError } from '#domain/errors/session_date_mismatch_error'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { parseIsoDate } from '#domain/services/plan_calendar'
import type { PlannedSession } from '#domain/entities/planned_session'

export interface LinkCompletedSessionInput {
  userId: number
  plannedSessionId: number
  completedSessionId: number
}

// Tolérance : la séance réalisée doit tomber dans la semaine planifiée ± 3 jours
const DATE_TOLERANCE_DAYS = 3

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

    // 4. Une séance réalisée ne peut être liée qu'à une seule séance planifiée
    // (sinon elle compterait double dans les bilans hebdomadaires)
    const planSessions = await this.planRepository.findSessionsByPlanId(activePlan.id)
    const alreadyLinked = planSessions.some(
      (s) => s.completedSessionId === input.completedSessionId && s.id !== input.plannedSessionId
    )
    if (alreadyLinked) throw new SessionAlreadyLinkedError()

    // 5. La date de la séance réalisée doit correspondre à la semaine planifiée
    const weekStart = parseIsoDate(activePlan.startDate)
    weekStart.setDate(weekStart.getDate() + (plannedSession.weekNumber - 1) * 7)
    const minDate = new Date(weekStart)
    minDate.setDate(minDate.getDate() - DATE_TOLERANCE_DAYS)
    const maxDate = new Date(weekStart)
    maxDate.setDate(maxDate.getDate() + 6 + DATE_TOLERANCE_DAYS)
    const sessionDate = parseIsoDate(completedSession.date.slice(0, 10))
    if (sessionDate < minDate || sessionDate > maxDate) {
      throw new SessionDateMismatchError()
    }

    // 6. Lier et passer le statut à 'completed'
    const updated = await this.planRepository.updateSession(input.plannedSessionId, {
      completedSessionId: input.completedSessionId,
      status: PlannedSessionStatus.Completed,
    })

    // 7. Émettre session:completed pour déclencher la mise à jour fitness + détection week:completed
    await emitter.emit('session:completed', {
      sessionId: input.completedSessionId,
      userId: input.userId,
    })

    return updated
  }
}
