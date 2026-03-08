import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorStatus } from '#domain/value_objects/connector_status'

export interface ConnectStravaInput {
  userId: number
  accessToken: string
  refreshToken: string
  expiresAt: number
}

@inject()
export default class ConnectStrava {
  constructor(private connectorRepository: ConnectorRepository) {}

  async execute(input: ConnectStravaInput): Promise<void> {
    await this.connectorRepository.upsert({
      userId: input.userId,
      provider: ConnectorProvider.Strava,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenExpiresAtSeconds: input.expiresAt,
      status: ConnectorStatus.Connected,
    })
  }
}
