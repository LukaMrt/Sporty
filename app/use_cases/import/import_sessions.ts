import { inject } from '@adonisjs/core'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { ConnectorNotConnectedError } from '#domain/errors/connector_not_connected_error'
import { MixedConnectorBatchError } from '#domain/errors/mixed_connector_batch_error'
import { DailyRateLimitError } from '#domain/errors/daily_rate_limit_error'
import ImportedSessionWriter from '#use_cases/import/imported_session_writer'

export { ConnectorNotConnectedError }

export type ImportSessionsInput = {
  userId: number
  importSessionIds: number[]
}

export type ImportSessionsResult = {
  total: number
  completed: number
  failed: number
  errors: string[]
  dailyLimitReached?: boolean
}

@inject()
export default class ImportSessions {
  constructor(
    private importSessionRepository: ImportSessionRepository,
    private connectorRegistry: ConnectorRegistry,
    private sportRepository: SportRepository,
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private writer: ImportedSessionWriter
  ) {}

  async reimport(input: { id: number; userId: number }): Promise<ImportSessionsResult | null> {
    const oldSessionId = await this.importSessionRepository.resetForReimport(input.id, input.userId)
    if (oldSessionId === null) return null
    await this.sessionRepository.forceDelete(oldSessionId)
    return this.execute({ userId: input.userId, importSessionIds: [input.id] })
  }

  async execute(input: ImportSessionsInput): Promise<ImportSessionsResult> {
    const { userId, importSessionIds } = input
    const total = importSessionIds.length
    let completed = 0
    let failed = 0
    const errors: string[] = []

    // Le provider est deduit des lignes de staging (restreintes a l'utilisateur)
    // plutot que fourni par le client : pas de parametre falsifiable.
    const connectorRefs = await this.importSessionRepository.findConnectorsForImportSessions(
      importSessionIds,
      userId
    )
    if (connectorRefs.length === 0) {
      throw new ConnectorNotConnectedError()
    }
    if (connectorRefs.length > 1) {
      throw new MixedConnectorBatchError()
    }
    const { provider } = connectorRefs[0]
    if (!this.connectorRegistry.has(provider)) {
      throw new ConnectorNotConnectedError(provider)
    }

    const connector = await this.connectorRegistry.getFactory(provider).make(userId)
    if (!connector) {
      throw new ConnectorNotConnectedError(provider)
    }

    const sports = await this.sportRepository.findAll()
    const profile = await this.userProfileRepository.findByUserId(userId)
    const context = ImportedSessionWriter.mappingContext(profile)

    const records = await this.importSessionRepository.findByIds(importSessionIds, connector.id)
    const recordById = new Map(records.map((r) => [r.id, r]))

    for (const id of importSessionIds) {
      const record = recordById.get(id)
      if (!record) {
        failed++
        errors.push(`id=${id}: record not found`)
        continue
      }

      try {
        const mapped = await connector.getSessionDetail(record.externalId, context)
        const result = await this.writer.write(userId, mapped, sports, profile)

        if (result.kind === 'unsupported_sport') {
          failed++
          await this.importSessionRepository.setFailed(id, `unsupported_sport:${result.sportSlug}`)
          errors.push(
            `id=${id} externalId=${record.externalId}: unsupported sport '${result.sportSlug}'`
          )
          continue
        }
        if (result.kind === 'duplicate') {
          failed++
          await this.importSessionRepository.setFailed(
            id,
            `duplicate_of:${result.existingSessionId}`
          )
          errors.push(
            `id=${id} externalId=${record.externalId}: duplicate of session ${result.existingSessionId}`
          )
          continue
        }

        await this.importSessionRepository.setImported(id, result.session.id)
        completed++
      } catch (err) {
        if (err instanceof DailyRateLimitError) {
          failed += importSessionIds.length - completed - failed
          return { total, completed, failed, errors, dailyLimitReached: true }
        }
        failed++
        errors.push(
          `id=${id} externalId=${record.externalId}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return { total, completed, failed, errors }
  }
}
