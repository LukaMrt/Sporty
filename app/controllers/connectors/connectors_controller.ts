import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetConnectorStatus from '#use_cases/connectors/get_connector_status'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import {
  describeProvider,
  type ConnectorAuthKind,
} from '#domain/value_objects/connector_descriptor'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { isProviderConfigured } from '#lib/connector_config'

export interface ConnectorCardDto {
  provider: ConnectorProvider
  authKind: ConnectorAuthKind
  configured: boolean
  status: ConnectorStatus | null
}

@inject()
export default class ConnectorsController {
  constructor(
    private getConnectorStatus: GetConnectorStatus,
    private connectorRegistry: ConnectorRegistry
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const userId = auth.user!.id

    // Seuls les providers effectivement branches sont affiches : un provider
    // connu du domaine mais sans factory n'a pas de page a offrir.
    const providers = Object.values(ConnectorProvider).filter((p) => this.connectorRegistry.has(p))

    const connectors: ConnectorCardDto[] = await Promise.all(
      providers.map(async (provider) => ({
        provider,
        authKind: describeProvider(provider).authKind,
        configured: isProviderConfigured(provider),
        status: await this.getConnectorStatus.getStatus(userId, provider),
      }))
    )

    return inertia.render('Connectors/Index', { connectors })
  }
}
