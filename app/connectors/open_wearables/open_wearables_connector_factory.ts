import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import type { Connector } from '#domain/interfaces/connector'
import type { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { RateLimitManager } from '#domain/interfaces/rate_limit_manager'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { OpenWearablesConnector } from '#connectors/open_wearables/open_wearables_connector'

export class OpenWearablesConnectorFactory extends ConnectorFactory {
  constructor(
    private connectorRepository: ConnectorRepository,
    private rateLimitManager: RateLimitManager,
    private baseUrl: string,
    private apiKeyHeader: string
  ) {
    super()
  }

  async make(userId: number): Promise<Connector | null> {
    if (!this.baseUrl) return null

    const record = await this.connectorRepository.findFullByUserAndProvider(
      userId,
      ConnectorProvider.OpenWearables
    )

    if (!record || record.status !== ConnectorStatus.Connected) return null
    // La cle API est stockee dans accessToken, l'UUID distant dans externalUserId :
    // les deux sont indispensables pour construire la moindre requete.
    if (!record.accessToken || !record.externalUserId) return null

    return new OpenWearablesConnector(
      record.id,
      record.externalUserId,
      record.accessToken,
      this.baseUrl,
      this.apiKeyHeader,
      this.rateLimitManager
    )
  }
}
