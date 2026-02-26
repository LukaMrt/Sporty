import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'

@inject()
export default class ListTrashedSessions {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(userId: number): Promise<TrainingSession[]> {
    return this.sessionRepository.findTrashedByUserId(userId)
  }
}
