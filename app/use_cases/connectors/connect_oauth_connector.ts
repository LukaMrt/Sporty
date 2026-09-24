import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { OAuthClient } from '#domain/interfaces/oauth_client'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorStatus } from '#domain/value_objects/connector_status'

export interface ConnectOAuthConnectorInput {
  userId: number
  provider: ConnectorProvider
  /** Code d'autorisation renvoyé par le provider */
  code: string
}

@inject()
export default class ConnectOAuthConnector {
  constructor(
    private connectorRepository: ConnectorRepository,
    private oauthClient: OAuthClient
  ) {}

  isConfigured(): boolean {
    return this.oauthClient.isConfigured()
  }

  authorizationUrl(state: string): string {
    return this.oauthClient.authorizationUrl(state)
  }

  async execute(input: ConnectOAuthConnectorInput): Promise<void> {
    const tokens = await this.oauthClient.exchangeCode(input.code)
    await this.connectorRepository.upsert({
      userId: input.userId,
      provider: input.provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAtSeconds: tokens.expiresAt,
      status: ConnectorStatus.Connected,
    })
  }
}
