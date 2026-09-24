import { inject } from '@adonisjs/core'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { Logger } from '#domain/interfaces/logger'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

/**
 * Importe les métriques quotidiennes de récupération (FC repos, HRV, sommeil,
 * poids…) des connecteurs qui en fournissent, dans `daily_metrics`.
 */
@inject()
export default class SyncWellness {
  constructor(
    private registry: ConnectorRegistry,
    private dailyMetrics: DailyMetricsRepository,
    private logger: Logger
  ) {}

  async execute(
    userId: number,
    provider: ConnectorProvider,
    from: Date,
    to: Date = new Date()
  ): Promise<number> {
    if (!this.registry.has(provider)) return 0
    const connector = await this.registry.getFactory(provider).make(userId)
    if (!connector?.supportsWellness()) return 0

    const days = await connector.listDailyWellness(from, to)
    await this.dailyMetrics.upsertMany(userId, days, provider)
    this.logger.info({ userId, provider, days: days.length }, 'Wellness synchronized')
    return days.length
  }
}
