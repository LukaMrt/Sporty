import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorFactory } from '#domain/interfaces/connector_factory'
import type { RateLimitManager } from '#domain/interfaces/rate_limit_manager'

export abstract class ConnectorRegistry {
  /**
   * Vrai si une factory est enregistree pour ce provider.
   *
   * Source de verite pour les routes `:provider` : un provider connu du domaine
   * mais pas encore branche doit repondre 404, pas 500.
   */
  abstract has(provider: ConnectorProvider): boolean
  abstract getFactory(provider: ConnectorProvider): ConnectorFactory
  abstract getRateLimitManager(provider: ConnectorProvider): RateLimitManager
}
