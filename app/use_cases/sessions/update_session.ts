import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import { getZoneForHr, calculateTrimp } from '#domain/services/heart_rate_zone_service'
import type { HeartRateZones } from '#domain/value_objects/run_metrics'

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

    const runMetrics: Record<string, unknown> = {}
    if (data.minHeartRate !== null && data.minHeartRate !== undefined)
      runMetrics.minHeartRate = data.minHeartRate
    if (data.maxHeartRate !== null && data.maxHeartRate !== undefined)
      runMetrics.maxHeartRate = data.maxHeartRate
    if (data.cadenceAvg !== null && data.cadenceAvg !== undefined)
      runMetrics.cadenceAvg = data.cadenceAvg
    if (data.elevationGain !== null && data.elevationGain !== undefined)
      runMetrics.elevationGain = data.elevationGain
    if (data.elevationLoss !== null && data.elevationLoss !== undefined)
      runMetrics.elevationLoss = data.elevationLoss

    if (data.avgHeartRate) {
      const profile = await this.userProfileRepository.findByUserId(userId)
      if (profile?.maxHeartRate) {
        const zone = getZoneForHr(
          profile.maxHeartRate,
          data.avgHeartRate,
          profile.restingHeartRate ?? undefined
        )
        if (zone >= 1) {
          const hrZones: HeartRateZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
          ;(hrZones as unknown as Record<string, number>)[`z${zone}`] = 100
          runMetrics.hrZones = hrZones
          runMetrics.trimp = calculateTrimp(data.durationMinutes, hrZones)
        }
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
