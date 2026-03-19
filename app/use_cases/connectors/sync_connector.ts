import { inject } from '@adonisjs/core'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { MappingContext } from '#domain/interfaces/connector'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { RateLimitExceededError } from '#domain/errors/rate_limit_exceeded_error'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'

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
    private importSessionRepository: ImportSessionRepository,
    private sportRepository: SportRepository,
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(input: SyncConnectorInput): Promise<SyncConnectorResult> {
    const { connectorId } = input

    const record = await this.connectorRepository.findById(connectorId)
    if (!record) {
      return { outcome: 'permanent_error', reason: 'Connector not found' }
    }

    try {
      // AC#3 — vérifier l'état avant tout appel API
      if (record.status === ConnectorStatus.Disconnected) {
        return { outcome: 'permanent_error', reason: 'Connector is disconnected' }
      }
      if (record.status === ConnectorStatus.Error) {
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

      const sessions = await connector.listSessions({
        after: new Date(Date.now() - 24 * 60 * 60 * 1000),
        before: new Date(),
        perPage: 200,
      })

      await this.importSessionRepository.upsertMany(
        connectorId,
        sessions.map((a) => ({
          externalId: a.externalId,
          rawData: a as unknown as Record<string, unknown>,
        }))
      )

      await this.connectorRepository.updateLastSyncAt(connectorId)

      // AC#2 — importer seulement si auto_import_enabled
      if (!autoImportEnabled) {
        return { outcome: 'success', imported: 0 }
      }

      const staged = await this.importSessionRepository.findByConnectorId(connectorId)
      const newSessions = staged.filter((r) => r.status === ImportSessionStatus.New)

      if (newSessions.length === 0) {
        return { outcome: 'success', imported: 0 }
      }

      const profile = await this.userProfileRepository.findByUserId(userId)
      const context: MappingContext = {
        maxHeartRate: profile?.maxHeartRate ?? undefined,
        restingHeartRate: profile?.restingHeartRate ?? undefined,
      }

      const sports = await this.sportRepository.findAll()
      const sportBySlug = new Map(sports.map((s) => [s.slug, s.id]))
      let imported = 0

      for (const stagingRecord of newSessions) {
        try {
          const mapped = await connector.getSessionDetail(stagingRecord.externalId, context)
          const sportId = sportBySlug.get(mapped.sportSlug)
          if (!sportId) {
            await this.importSessionRepository.setFailed(
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

          await this.importSessionRepository.setImported(stagingRecord.id, session.id)
          imported++
        } catch {
          // Session-level error: skip and continue
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
