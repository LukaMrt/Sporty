import { inject } from '@adonisjs/core'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type { StagingSessionRecord } from '#domain/interfaces/import_session_repository'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { ConnectorNotConnectedError } from '#domain/errors/connector_not_connected_error'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

export { ConnectorNotConnectedError }

const DEFAULT_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface ListPreImportSessionsInput {
  userId: number
  provider: ConnectorProvider
  after?: Date
  before?: Date
}

@inject()
export default class ListPreImportSessions {
  constructor(
    private importSessionRepository: ImportSessionRepository,
    private connectorRegistry: ConnectorRegistry,
    private sessionRepository: SessionRepository
  ) {}

  async execute(input: ListPreImportSessionsInput): Promise<StagingSessionRecord[]> {
    if (!this.connectorRegistry.has(input.provider)) {
      throw new ConnectorNotConnectedError(input.provider)
    }

    const connector = await this.connectorRegistry.getFactory(input.provider).make(input.userId)

    if (!connector) {
      throw new ConnectorNotConnectedError(input.provider)
    }

    const after = input.after ?? new Date(Date.now() - DEFAULT_LOOKBACK_MS)

    const before = input.before ?? new Date()

    const sessions = await connector.listSessions({
      after,
      before,
      perPage: 200,
    })

    await this.importSessionRepository.upsertMany(
      connector.id,
      sessions.map((a) => ({
        externalId: a.externalId,
        rawData: a as unknown as Record<string, unknown>,
      }))
    )

    // Story 10.3 AC#3 — marquer comme importées les sessions déjà présentes
    const externalIds = sessions.map((a) => a.externalId)
    const existingSessions = await this.sessionRepository.findByUserAndExternalIds(
      input.userId,
      externalIds
    )
    if (existingSessions.length > 0) {
      await this.importSessionRepository.markImportedBulk(
        connector.id,
        existingSessions.map((s) => ({ externalId: s.externalId, sessionId: s.id }))
      )
    }

    const allRecords = await this.importSessionRepository.findByConnectorId(connector.id)

    const afterMs = after.getTime()
    const beforeMs = before.getTime() + 86_400_000 - 1

    return allRecords.filter((r) => {
      const date = r.rawData?.date as string | undefined
      if (!date) return true
      const ts = new Date(date).getTime()
      return ts >= afterMs && ts <= beforeMs
    })
  }
}
