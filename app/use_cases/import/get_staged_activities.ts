import { inject } from '@adonisjs/core'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type { StagingActivityRecord } from '#domain/interfaces/import_activity_repository'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'

@inject()
export default class GetStagedActivities {
  constructor(
    private importActivityRepository: ImportActivityRepository,
    private connectorRepository: ConnectorRepository
  ) {}

  async execute(userId: number, provider: ConnectorProvider): Promise<StagingActivityRecord[]> {
    const connector = await this.connectorRepository.findFullByUserAndProvider(userId, provider)
    if (!connector) return []
    return this.importActivityRepository.findByConnectorId(connector.id)
  }
}
