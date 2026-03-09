import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import type { Connector } from '#domain/interfaces/connector'
import type { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { RateLimitManager } from '#connectors/rate_limit_manager'
import { StravaConnector } from '#connectors/strava/strava_connector'

export class StravaConnectorFactory extends ConnectorFactory {
  constructor(
    private connectorRepository: ConnectorRepository,
    private rateLimitManager: RateLimitManager,
    private clientId: string,
    private clientSecret: string
  ) {
    super()
  }

  async make(userId: number): Promise<Connector | null> {
    const record = await this.connectorRepository.findFullByUserAndProvider(
      userId,
      ConnectorProvider.Strava
    )

    if (!record || record.status !== ConnectorStatus.Connected) return null
    if (!record.accessToken || !record.refreshToken) return null

    return new StravaConnector(
      record.id,
      userId,
      {
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        expiresAt: record.tokenExpiresAtSeconds ?? 0,
      },
      this.connectorRepository,
      this.rateLimitManager,
      this.clientId,
      this.clientSecret
    )
  }
}
