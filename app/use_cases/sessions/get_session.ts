import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

@inject()
export default class GetSession {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(sessionId: number, userId: number): Promise<TrainingSession> {
    const session = await this.sessionRepository.findById(sessionId)
    if (!session) throw new SessionNotFoundError(sessionId)
    if (session.userId !== userId) throw new SessionForbiddenError()
    return session
  }
}
