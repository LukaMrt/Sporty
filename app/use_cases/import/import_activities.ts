import { inject } from '@adonisjs/core'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { ImportProgressPort } from '#domain/interfaces/import_progress_port'
import { ActivityMapper } from '#domain/interfaces/activity_mapper'
import { ConnectorNotConnectedError } from '#domain/errors/connector_not_connected_error'

export { ConnectorNotConnectedError }

export interface ImportActivitiesInput {
  userId: number
  importActivityIds: number[]
}

export interface ImportActivitiesResult {
  total: number
  completed: number
  failed: number
}

@inject()
export default class ImportActivities {
  constructor(
    private importActivityRepository: ImportActivityRepository,
    private connectorFactory: ConnectorFactory,
    private sportRepository: SportRepository,
    private sessionRepository: SessionRepository,
    private progressPort: ImportProgressPort,
    private activityMapper: ActivityMapper
  ) {}

  async execute(input: ImportActivitiesInput): Promise<ImportActivitiesResult> {
    const { userId, importActivityIds } = input
    const total = importActivityIds.length

    this.progressPort.init(userId, total)

    const connector = await this.connectorFactory.make(userId)
    if (!connector) {
      throw new ConnectorNotConnectedError('Strava')
    }

    const sports = await this.sportRepository.findAll()
    const sportBySlug = new Map(sports.map((s) => [s.slug, s.id]))

    const records = await this.importActivityRepository.findByIds(importActivityIds)
    const recordById = new Map(records.map((r) => [r.id, r]))

    for (const id of importActivityIds) {
      const record = recordById.get(id)
      if (!record) {
        this.progressPort.incrementFailed(userId, `id=${id}: record not found`)
        continue
      }

      try {
        const detail = await connector.getActivityDetail(record.externalId)
        const mapped = this.activityMapper.map(detail)

        const sportId = sportBySlug.get(mapped.sportSlug)
        if (!sportId) {
          this.progressPort.incrementFailed(
            userId,
            `id=${id} externalId=${record.externalId}: sport slug '${mapped.sportSlug}' not found in DB (available: ${[...sportBySlug.keys()].join(', ')})`
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

        await this.importActivityRepository.setImported(id, session.id)
        this.progressPort.incrementCompleted(userId)
      } catch (err) {
        this.progressPort.incrementFailed(
          userId,
          `id=${id} externalId=${record.externalId}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return this.progressPort.get(userId) ?? { total, completed: 0, failed: total }
  }
}
