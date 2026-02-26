import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { ListSessionsOptions } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

@inject()
export default class ListSessions {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(
    userId: number,
    opts?: ListSessionsOptions
  ): Promise<PaginatedResult<TrainingSession>> {
    return this.sessionRepository.findAllByUserId(userId, opts)
  }
}
