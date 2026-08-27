import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorStatus } from '#domain/value_objects/connector_status'

export interface ConnectOAuthConnectorInput {
  userId: number
  provider: ConnectorProvider
  accessToken: string
  refreshToken: string
  expiresAt: number
}

@inject()
export default class ConnectOAuthConnector {
  constructor(private connectorRepository: ConnectorRepository) {}

  async execute(input: ConnectOAuthConnectorInput): Promise<void> {
    await this.connectorRepository.upsert({
      userId: input.userId,
      provider: input.provider,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenExpiresAtSeconds: input.expiresAt,
      status: ConnectorStatus.Connected,
    })
  }
}
