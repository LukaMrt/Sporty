import { inject } from '@adonisjs/core'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { RateLimitExceededError } from '#domain/errors/rate_limit_exceeded_error'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'

export interface SyncConnectorInput {
  connectorId: number
}

export type SyncConnectorResult =
  | { outcome: 'success'; imported: number }
  | { outcome: 'permanent_error'; reason: string }
  | { outcome: 'temporary_error'; reason: string }

@inject()
export default class SyncConnector {
  constructor(
    private registry: ConnectorRegistry,
    private connectorRepository: ConnectorRepository,
    private importActivityRepository: ImportActivityRepository,
    private sportRepository: SportRepository,
    private sessionRepository: SessionRepository
  ) {}

  async execute(input: SyncConnectorInput): Promise<SyncConnectorResult> {
    const { connectorId } = input

    const record = await this.connectorRepository.findById(connectorId)
    if (!record) {
      return { outcome: 'permanent_error', reason: 'Connector not found' }
    }

    try {
      // AC#3 — vérifier l'état avant tout appel API
      if (
        record.status === ConnectorStatus.Error ||
        record.status === ConnectorStatus.Disconnected
      ) {
        throw new ConnectorAuthError(record.provider)
      }

      const { provider, userId, autoImportEnabled } = record

      const rateLimiter = this.registry.getRateLimitManager(provider)
      await rateLimiter.waitIfNeeded()

      const factory = this.registry.getFactory(provider)
      const connector = await factory.make(userId)
      if (!connector) {
        return { outcome: 'permanent_error', reason: 'Connector not connected' }
      }

      const activities = await connector.listActivities({
        after: new Date(Date.now() - 24 * 60 * 60 * 1000),
        before: new Date(),
        perPage: 200,
      })

      await this.importActivityRepository.upsertMany(
        connectorId,
        activities.map((a) => ({
          externalId: a.externalId,
          rawData: a as unknown as Record<string, unknown>,
        }))
      )

      await this.connectorRepository.updateLastSyncAt(connectorId)

      // AC#2 — importer seulement si auto_import_enabled
      if (!autoImportEnabled) {
        return { outcome: 'success', imported: 0 }
      }

      const staged = await this.importActivityRepository.findByConnectorId(connectorId)
      const newActivities = staged.filter((r) => r.status === ImportActivityStatus.New)

      if (newActivities.length === 0) {
        return { outcome: 'success', imported: 0 }
      }

      const mapper = this.registry.getMapper(provider)
      const sports = await this.sportRepository.findAll()
      const sportBySlug = new Map(sports.map((s) => [s.slug, s.id]))
      let imported = 0

      for (const stagingRecord of newActivities) {
        try {
          const detail = await connector.getActivityDetail(stagingRecord.externalId)
          const mapped = mapper.map(detail)
          const sportId = sportBySlug.get(mapped.sportSlug)
          if (!sportId) {
            await this.importActivityRepository.setFailed(
              stagingRecord.id,
              `unsupported_sport:${mapped.sportSlug}`
            )
            continue
          }

          const session = await this.sessionRepository.create({
            userId,
            sportId,
            date: mapped.date,
            durationMinutes: mapped.durationMinutes,
            distanceKm: mapped.distanceKm,
            avgHeartRate: mapped.avgHeartRate,
            perceivedEffort: null,
            sportMetrics: mapped.sportMetrics,
            notes: null,
            importedFrom: mapped.importedFrom,
            externalId: mapped.externalId,
          })

          await this.importActivityRepository.setImported(stagingRecord.id, session.id)
          imported++
        } catch {
          // Activity-level error: skip and continue
        }
      }

      return { outcome: 'success', imported }
    } catch (err) {
      if (err instanceof ConnectorAuthError) {
        await this.connectorRepository.setStatus(
          record.userId,
          record.provider,
          ConnectorStatus.Error
        )
        return { outcome: 'permanent_error', reason: err.message }
      }
      if (err instanceof RateLimitExceededError) {
        return { outcome: 'temporary_error', reason: err.message }
      }
      return {
        outcome: 'temporary_error',
        reason: err instanceof Error ? err.message : String(err),
      }
    }
  }
}
