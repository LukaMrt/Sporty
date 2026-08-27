import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ApiKeyConnectorVerifier } from '#domain/interfaces/api_key_connector_verifier'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorStatus } from '#domain/value_objects/connector_status'

export interface ConnectApiKeyConnectorInput {
  userId: number
  provider: ConnectorProvider
  apiKey: string
}

@inject()
export default class ConnectApiKeyConnector {
  constructor(
    private connectorRepository: ConnectorRepository,
    private verifier: ApiKeyConnectorVerifier
  ) {}

  async execute(input: ConnectApiKeyConnectorInput): Promise<void> {
    // La cle n'est stockee qu'apres verification : pas de connecteur "connecte"
    // avec une cle invalide.
    const identity = await this.verifier.verify(input.provider, input.apiKey)

    await this.connectorRepository.upsert({
      userId: input.userId,
      provider: input.provider,
      accessToken: input.apiKey,
      refreshToken: null,
      tokenExpiresAtSeconds: null,
      externalUserId: identity.externalUserId,
      status: ConnectorStatus.Connected,
    })
  }
}
