import { inject } from '@adonisjs/core'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'

export type RestoreSessionInput = {
  id: number
  userId: number
}

@inject()
export default class RestoreSession {
  constructor(private importSessionRepository: ImportSessionRepository) {}

  async execute(input: RestoreSessionInput): Promise<void> {
    await this.importSessionRepository.setNew(input.id, input.userId)
  }
}
