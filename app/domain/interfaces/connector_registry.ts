import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorFactory } from '#domain/interfaces/connector_factory'
import type { ActivityMapper } from '#domain/interfaces/activity_mapper'
import type { RateLimitManager } from '#domain/interfaces/rate_limit_manager'

export abstract class ConnectorRegistry {
  abstract getFactory(provider: ConnectorProvider): ConnectorFactory
  abstract getMapper(provider: ConnectorProvider): ActivityMapper
  abstract getRateLimitManager(provider: ConnectorProvider): RateLimitManager
}
