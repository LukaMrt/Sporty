import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { getZoneForHr, calculateTrimp } from '#domain/services/heart_rate_zone_service'
import type { HeartRateZones } from '#domain/value_objects/run_metrics'

export interface CreateSessionInput {
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
  gpxFilePath?: string | null
}

@inject()
export default class CreateSession {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(userId: number, input: CreateSessionInput): Promise<TrainingSession> {
    const runMetrics: Record<string, unknown> = {}
    if (input.minHeartRate !== null && input.minHeartRate !== undefined)
      runMetrics.minHeartRate = input.minHeartRate
    if (input.maxHeartRate !== null && input.maxHeartRate !== undefined)
      runMetrics.maxHeartRate = input.maxHeartRate
    if (input.cadenceAvg !== null && input.cadenceAvg !== undefined)
      runMetrics.cadenceAvg = input.cadenceAvg
    if (input.elevationGain !== null && input.elevationGain !== undefined)
      runMetrics.elevationGain = input.elevationGain
    if (input.elevationLoss !== null && input.elevationLoss !== undefined)
      runMetrics.elevationLoss = input.elevationLoss

    if (input.avgHeartRate) {
      const profile = await this.userProfileRepository.findByUserId(userId)
      if (profile?.maxHeartRate) {
        const zone = getZoneForHr(
          profile.maxHeartRate,
          input.avgHeartRate,
          profile.restingHeartRate ?? undefined
        )
        if (zone >= 1) {
          const hrZones: HeartRateZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
          ;(hrZones as unknown as Record<string, number>)[`z${zone}`] = 100
          runMetrics.hrZones = hrZones
          runMetrics.trimp = calculateTrimp(input.durationMinutes, hrZones)
        }
      }
    }

    return this.sessionRepository.create({
      userId,
      sportId: input.sportId,
      date: input.date,
      durationMinutes: input.durationMinutes,
      distanceKm: input.distanceKm ?? null,
      avgHeartRate: input.avgHeartRate ?? null,
      perceivedEffort: input.perceivedEffort ?? null,
      sportMetrics: { ...(input.sportMetrics ?? {}), ...runMetrics },
      notes: input.notes ?? null,
      gpxFilePath: input.gpxFilePath ?? null,
    })
  }
}
