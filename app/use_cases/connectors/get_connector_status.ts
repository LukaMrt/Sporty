import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorStatus } from '#domain/value_objects/connector_status'

export type ConnectorStatusByProvider = Record<ConnectorProvider, ConnectorStatus | null>

@inject()
export default class GetConnectorStatus {
  constructor(private connectorRepository: ConnectorRepository) {}

  async getStatus(userId: number, provider: ConnectorProvider): Promise<ConnectorStatus | null> {
    const connector = await this.connectorRepository.findByUserAndProvider(userId, provider)
    return connector?.status ?? null
  }

  async isConnected(userId: number, provider: ConnectorProvider): Promise<boolean> {
    const status = await this.getStatus(userId, provider)
    return status === ConnectorStatus.Connected
  }

  async listStatuses(userId: number): Promise<ConnectorStatusByProvider> {
    const providers = Object.values(ConnectorProvider)
    const statuses = await Promise.all(providers.map((p) => this.getStatus(userId, p)))
    return Object.fromEntries(
      providers.map((provider, index) => [provider, statuses[index]])
    ) as ConnectorStatusByProvider
  }
}
