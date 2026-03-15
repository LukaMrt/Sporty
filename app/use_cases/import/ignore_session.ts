import { inject } from '@adonisjs/core'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'

export interface IgnoreSessionInput {
  id: number
  userId: number
}

@inject()
export default class IgnoreSession {
  constructor(private importSessionRepository: ImportSessionRepository) {}

  async execute(input: IgnoreSessionInput): Promise<void> {
    await this.importSessionRepository.setIgnored(input.id, input.userId)
  }
}
