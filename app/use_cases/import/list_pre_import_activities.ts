import { inject } from '@adonisjs/core'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type { StagingActivityRecord } from '#domain/interfaces/import_activity_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
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
    private connectorFactory: ConnectorFactory
  ) {}

  async execute(input: ListPreImportActivitiesInput): Promise<StagingActivityRecord[]> {
    const connector = await this.connectorFactory.make(input.userId)

    if (!connector) {
      throw new ConnectorNotConnectedError('Strava')
    }

    const after = input.after ?? new Date(Date.now() - DEFAULT_LOOKBACK_MS)

    const activities = await connector.listActivities({
      after,
      before: input.before,
      perPage: 200,
    })

    await this.importActivityRepository.upsertMany(
      connector.id,
      activities.map((a) => ({
        externalId: a.externalId,
        rawData: a as unknown as Record<string, unknown>,
      }))
    )

    return this.importActivityRepository.findByConnectorId(connector.id)
  }
}
