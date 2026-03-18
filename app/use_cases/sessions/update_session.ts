import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import {
  buildScalarRunMetrics,
  buildMonoZoneHrMetrics,
} from '#domain/services/heart_rate_zone_service'

export interface UpdateSessionInput {
  sportId: number
  date: string
  durationMinutes: number
  distanceKm?: number | null
  avgHeartRate?: number | null
  perceivedEffort?: number | null
  sportMetrics?: Record<string, unknown>
  notes?: string | null
  minHeartRate?: number | null
  maxHeartRate?: number | null
  cadenceAvg?: number | null
  elevationGain?: number | null
  elevationLoss?: number | null
}

@inject()
export default class UpdateSession {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(
    sessionId: number,
    userId: number,
    data: UpdateSessionInput
  ): Promise<TrainingSession> {
    const existing = await this.sessionRepository.findById(sessionId)
    if (!existing) throw new SessionNotFoundError(sessionId)
    if (existing.userId !== userId) throw new SessionForbiddenError()

    const runMetrics: Record<string, unknown> = { ...buildScalarRunMetrics(data) }

    if (data.avgHeartRate) {
      const profile = await this.userProfileRepository.findByUserId(userId)
      if (profile?.maxHeartRate) {
        const result = buildMonoZoneHrMetrics(
          profile.maxHeartRate,
          profile.restingHeartRate ?? undefined,
          data.avgHeartRate,
          data.durationMinutes
        )
        if (result) Object.assign(runMetrics, result)
      }
    }

    return this.sessionRepository.update(sessionId, {
      sportId: data.sportId,
      date: data.date,
      durationMinutes: data.durationMinutes,
      distanceKm: data.distanceKm ?? null,
      avgHeartRate: data.avgHeartRate ?? null,
      perceivedEffort: data.perceivedEffort ?? null,
      sportMetrics: { ...(data.sportMetrics ?? {}), ...runMetrics },
      notes: data.notes ?? null,
    })
  }
}
