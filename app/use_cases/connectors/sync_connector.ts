import { inject } from '@adonisjs/core'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { ActivityMapper } from '#domain/interfaces/activity_mapper'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'

export interface SyncConnectorInput {
  connectorId: number
  userId: number
}

export type SyncConnectorResult =
  | { outcome: 'success'; imported: number }
  | { outcome: 'permanent_error'; reason: string }
  | { outcome: 'temporary_error'; reason: string }

const LOOKBACK_MS = 24 * 60 * 60 * 1000 // 24h

@inject()
export default class SyncConnector {
  constructor(
    private importActivityRepository: ImportActivityRepository,
    private connectorFactory: ConnectorFactory,
    private connectorRepository: ConnectorRepository,
    private sportRepository: SportRepository,
    private sessionRepository: SessionRepository,
    private activityMapper: ActivityMapper
  ) {}

  async execute(input: SyncConnectorInput): Promise<SyncConnectorResult> {
    const { connectorId, userId } = input

    try {
      const connector = await this.connectorFactory.make(userId)
      if (!connector) {
        return { outcome: 'permanent_error', reason: 'Connector not connected' }
      }

      const after = new Date(Date.now() - LOOKBACK_MS)
      const activities = await connector.listActivities({ after, before: new Date(), perPage: 200 })

      await this.importActivityRepository.upsertMany(
        connectorId,
        activities.map((a) => ({
          externalId: a.externalId,
          rawData: a as unknown as Record<string, unknown>,
        }))
      )

      const staged = await this.importActivityRepository.findByConnectorId(connectorId)
      const newActivities = staged.filter((r) => r.status === ImportActivityStatus.New)

      if (newActivities.length === 0) {
        return { outcome: 'success', imported: 0 }
      }

      const sports = await this.sportRepository.findAll()
      const sportBySlug = new Map(sports.map((s) => [s.slug, s.id]))
      let imported = 0

      for (const record of newActivities) {
        try {
          const detail = await connector.getActivityDetail(record.externalId)
          const mapped = this.activityMapper.map(detail)
          const sportId = sportBySlug.get(mapped.sportSlug)
          if (!sportId) continue

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

          await this.importActivityRepository.setImported(record.id, session.id)
          imported++
        } catch {
          // Activity-level error: skip and continue
        }
      }

      return { outcome: 'success', imported }
    } catch (err) {
      if (err instanceof ConnectorAuthError) {
        await this.connectorRepository.setStatus(
          userId,
          ConnectorProvider.Strava,
          ConnectorStatus.Error
        )
        return { outcome: 'permanent_error', reason: err.message }
      }
      return {
        outcome: 'temporary_error',
        reason: err instanceof Error ? err.message : String(err),
      }
    }
  }
}
