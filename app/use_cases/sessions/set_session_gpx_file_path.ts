import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

@inject()
export default class SetSessionGpxFilePath {
  constructor(
    private sessionRepository: SessionRepository,
    private gpxFileStorage: GpxFileStorage
  ) {}

  async execute(sessionId: number, userId: number, tempId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId)
    if (!session) throw new SessionNotFoundError(sessionId)
    if (session.userId !== userId) throw new SessionForbiddenError()

    const gpxFilePath = await this.gpxFileStorage.moveTempFile(tempId, userId, sessionId)
    await this.sessionRepository.update(sessionId, { gpxFilePath })
  }
}
