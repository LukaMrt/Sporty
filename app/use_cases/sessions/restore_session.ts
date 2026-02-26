import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

@inject()
export default class RestoreSession {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(sessionId: number, userId: number): Promise<void> {
    const session = await this.sessionRepository.findByIdIncludingTrashed(sessionId)
    if (!session) throw new SessionNotFoundError(sessionId)
    if (session.userId !== userId) throw new SessionForbiddenError()

    await this.sessionRepository.restore(sessionId)
  }
}
