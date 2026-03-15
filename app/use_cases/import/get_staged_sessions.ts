import { inject } from '@adonisjs/core'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type { StagingSessionRecord } from '#domain/interfaces/import_session_repository'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'

@inject()
export default class GetStagedSessions {
  constructor(
    private importSessionRepository: ImportSessionRepository,
    private connectorRepository: ConnectorRepository
  ) {}

  async execute(userId: number, provider: ConnectorProvider): Promise<StagingSessionRecord[]> {
    const connector = await this.connectorRepository.findFullByUserAndProvider(userId, provider)
    if (!connector) return []
    return this.importSessionRepository.findByConnectorId(connector.id)
  }
}
