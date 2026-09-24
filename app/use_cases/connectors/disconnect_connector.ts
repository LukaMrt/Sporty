import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { Logger } from '#domain/interfaces/logger'
import { ConnectorScheduler } from '#domain/interfaces/connector_scheduler'

export type DisconnectConnectorInput = {
  userId: number
  provider: ConnectorProvider
}

@inject()
export default class DisconnectConnector {
  constructor(
    private connectorRepository: ConnectorRepository,
    private connectorRegistry: ConnectorRegistry,
    private logger: Logger,
    private scheduler: ConnectorScheduler
  ) {}

  async execute(input: DisconnectConnectorInput): Promise<void> {
    const { userId, provider } = input

    // Revocation distante best-effort. Elle est volontairement non bloquante :
    // le cas d'usage principal de la deconnexion est un connecteur en erreur, pour
    // lequel la factory renvoie null et dont le token est de toute facon invalide.
    try {
      if (this.connectorRegistry.has(provider)) {
        const connector = await this.connectorRegistry.getFactory(provider).make(userId)
        await connector?.disconnect()
      }
    } catch (error) {
      // Non bloquant : la suppression locale doit toujours aboutir
      this.logger.warn({ err: error, userId, provider }, 'Remote connector revocation failed')
    }

    const record = await this.connectorRepository.findFullByUserAndProvider(userId, provider)
    await this.connectorRepository.disconnect(userId, provider)
    // Plus de synchronisation planifiée pour un connecteur supprimé
    if (record) this.scheduler.removeConnector(record.id)
  }
}
