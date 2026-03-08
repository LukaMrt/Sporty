import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorStatus } from '#domain/value_objects/connector_status'

@inject()
export default class GetStravaConnector {
  constructor(private connectorRepository: ConnectorRepository) {}

  async getStatus(userId: number): Promise<ConnectorStatus | null> {
    const connector = await this.connectorRepository.findByUserAndProvider(
      userId,
      ConnectorProvider.Strava
    )
    return connector?.status ?? null
  }

  async isConnected(userId: number): Promise<boolean> {
    const status = await this.getStatus(userId)
    return status === ConnectorStatus.Connected
  }
}
