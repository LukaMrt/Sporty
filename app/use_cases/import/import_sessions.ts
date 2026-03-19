import { inject } from '@adonisjs/core'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { MappingContext } from '#domain/interfaces/connector'
import { ConnectorNotConnectedError } from '#domain/errors/connector_not_connected_error'
import { DailyRateLimitError } from '#domain/errors/daily_rate_limit_error'

export { ConnectorNotConnectedError }

export interface ImportSessionsInput {
  userId: number
  importSessionIds: number[]
}

export interface ImportSessionsResult {
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
    private connectorFactory: ConnectorFactory,
    private sportRepository: SportRepository,
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository
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

    const connector = await this.connectorFactory.make(userId)
    if (!connector) {
      throw new ConnectorNotConnectedError('Strava')
    }

    const sports = await this.sportRepository.findAll()
    const sportBySlug = new Map(sports.map((s) => [s.slug, s.id]))

    const profile = await this.userProfileRepository.findByUserId(userId)
    const context: MappingContext = {
      maxHeartRate: profile?.maxHeartRate ?? undefined,
      restingHeartRate: profile?.restingHeartRate ?? undefined,
    }

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

        const sportId = sportBySlug.get(mapped.sportSlug)
        if (!sportId) {
          failed++
          errors.push(
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

        await this.importSessionRepository.setImported(id, session.id)
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
