import { inject } from '@adonisjs/core'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type { StagingActivityRecord } from '#domain/interfaces/import_activity_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { ConnectorNotConnectedError } from '#domain/errors/connector_not_connected_error'

export { ConnectorNotConnectedError }

const DEFAULT_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface ListPreImportActivitiesInput {
  userId: number
  after?: Date
  before?: Date
}

@inject()
export default class ListPreImportActivities {
  constructor(
    private importActivityRepository: ImportActivityRepository,
    private connectorFactory: ConnectorFactory,
    private sessionRepository: SessionRepository
  ) {}

  async execute(input: ListPreImportActivitiesInput): Promise<StagingActivityRecord[]> {
    const connector = await this.connectorFactory.make(input.userId)

    if (!connector) {
      throw new ConnectorNotConnectedError('Strava')
    }

    const after = input.after ?? new Date(Date.now() - DEFAULT_LOOKBACK_MS)

    const before = input.before ?? new Date()

    const activities = await connector.listActivities({
      after,
      before,
      perPage: 200,
    })

    await this.importActivityRepository.upsertMany(
      connector.id,
      activities.map((a) => ({
        externalId: a.externalId,
        rawData: a as unknown as Record<string, unknown>,
      }))
    )

    // Story 10.3 AC#3 — marquer comme importées les activités déjà présentes en sessions
    const externalIds = activities.map((a) => a.externalId)
    const existingSessions = await this.sessionRepository.findByUserAndExternalIds(
      input.userId,
      externalIds
    )
    if (existingSessions.length > 0) {
      await this.importActivityRepository.markImportedBulk(
        connector.id,
        existingSessions.map((s) => ({ externalId: s.externalId, sessionId: s.id }))
      )
    }

    const allRecords = await this.importActivityRepository.findByConnectorId(connector.id)

    const afterMs = after.getTime()
    const beforeMs = before.getTime() + 86_400_000 - 1

    return allRecords.filter((r) => {
      const startDate = (r.rawData as { startDate?: string } | null)?.startDate
      if (!startDate) return true
      const ts = new Date(startDate).getTime()
      return ts >= afterMs && ts <= beforeMs
    })
  }
}
