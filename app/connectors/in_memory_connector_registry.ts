import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorFactory } from '#domain/interfaces/connector_factory'
import type { SessionMapper } from '#domain/interfaces/session_mapper'
import type { RateLimitManager } from '#domain/interfaces/rate_limit_manager'

interface ProviderEntry {
  factory: ConnectorFactory
  mapper: SessionMapper
  rateLimiter: RateLimitManager
}

export class InMemoryConnectorRegistry extends ConnectorRegistry {
  readonly #providers = new Map<ConnectorProvider, ProviderEntry>()

  register(provider: ConnectorProvider, entry: ProviderEntry): void {
    this.#providers.set(provider, entry)
  }

  getFactory(provider: ConnectorProvider): ConnectorFactory {
    return this.#get(provider).factory
  }

  getMapper(provider: ConnectorProvider): SessionMapper {
    return this.#get(provider).mapper
  }

  getRateLimitManager(provider: ConnectorProvider): RateLimitManager {
    return this.#get(provider).rateLimiter
  }

  #get(provider: ConnectorProvider): ProviderEntry {
    const entry = this.#providers.get(provider)
    if (!entry) throw new Error(`No connector registered for provider: ${provider}`)
    return entry
  }
}
