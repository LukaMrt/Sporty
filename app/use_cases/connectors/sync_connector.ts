import { inject } from '@adonisjs/core'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { Logger } from '#domain/interfaces/logger'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { RateLimitExceededError } from '#domain/errors/rate_limit_exceeded_error'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'
import { syncWindowStart } from '#domain/services/sync_window'
import ImportedSessionWriter from '#use_cases/import/imported_session_writer'
import SyncWellness from '#use_cases/wellness/sync_wellness'

export type SyncConnectorInput = {
  connectorId: number
}

export type SyncConnectorResult =
  | { outcome: 'success'; imported: number }
  | { outcome: 'permanent_error'; reason: string }
  | { outcome: 'temporary_error'; reason: string }

/** Nombre d'échecs d'import d'une même séance avant abandon */
export const MAX_IMPORT_ATTEMPTS = 3

@inject()
export default class SyncConnector {
  constructor(
    private registry: ConnectorRegistry,
    private connectorRepository: ConnectorRepository,
    private importSessionRepository: ImportSessionRepository,
    private sportRepository: SportRepository,
    private userProfileRepository: UserProfileRepository,
    private writer: ImportedSessionWriter,
    private logger: Logger,
    private syncWellness?: SyncWellness
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
        after: syncWindowStart(record.lastSyncAt),
        before: new Date(),
      })

      await this.importSessionRepository.upsertMany(
        connectorId,
        sessions.map((a) => ({
          externalId: a.externalId,
          rawData: a,
        }))
      )

      await this.connectorRepository.updateLastSyncAt(connectorId)

      // Récupération des 7 derniers jours (sommeil, HRV… arrivent parfois en différé)
      if (this.syncWellness && connector.supportsWellness()) {
        try {
          await this.syncWellness.execute(userId, provider, new Date(Date.now() - 7 * 86_400_000))
        } catch (error) {
          if (error instanceof ConnectorAuthError) throw error
          this.logger.warn({ connectorId, err: error }, 'Wellness sync failed')
        }
      }

      // AC#2 — importer seulement si auto_import_enabled
      if (!autoImportEnabled) {
        return { outcome: 'success', imported: 0 }
      }

      const staged = await this.importSessionRepository.findByConnectorId(connectorId)
      const newSessions = staged.filter((r) => r.status === ImportSessionStatus.New)

      if (newSessions.length === 0) {
        return { outcome: 'success', imported: 0 }
      }

      const [profile, sports] = await Promise.all([
        this.userProfileRepository.findByUserId(userId),
        this.sportRepository.findAll(),
      ])
      const context = ImportedSessionWriter.mappingContext(profile)
      let imported = 0

      for (const stagingRecord of newSessions) {
        try {
          const mapped = await connector.getSessionDetail(stagingRecord.externalId, context)
          const result = await this.writer.write(userId, mapped, sports, profile)

          if (result.kind === 'unsupported_sport') {
            await this.importSessionRepository.setFailed(
              stagingRecord.id,
              `unsupported_sport:${result.sportSlug}`
            )
          } else if (result.kind === 'duplicate') {
            await this.importSessionRepository.setFailed(
              stagingRecord.id,
              `duplicate_of:${result.existingSessionId}`
            )
          } else {
            await this.importSessionRepository.setImported(stagingRecord.id, result.session.id)
            imported++
          }
        } catch (error) {
          // Une erreur d'authentification ou de quota concerne tout le connecteur
          if (error instanceof ConnectorAuthError || error instanceof RateLimitExceededError) {
            throw error
          }
          const reason = error instanceof Error ? error.message : String(error)
          const abandoned = await this.importSessionRepository.recordFailure(
            stagingRecord.id,
            reason,
            MAX_IMPORT_ATTEMPTS
          )
          this.logger.warn(
            { connectorId, externalId: stagingRecord.externalId, err: error, abandoned },
            'Session import failed during sync'
          )
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
        this.logger.warn({ connectorId, provider: record.provider }, 'Connector auth failed')
        return { outcome: 'permanent_error', reason: err.message }
      }
      const reason = err instanceof Error ? err.message : String(err)
      this.logger.warn({ connectorId, err }, 'Connector sync failed temporarily')
      return { outcome: 'temporary_error', reason }
    }
  }
}
