import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import {
  buildScalarRunMetrics,
  buildMonoZoneHrMetrics,
  calculateZones,
  calculateDrift,
  calculateTrimp,
} from '#domain/services/heart_rate_zone_service'
import type { DataPoint } from '#domain/value_objects/run_metrics'

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
    const runMetrics: Record<string, unknown> = { ...buildScalarRunMetrics(input) }
    const heartRateCurve = input.sportMetrics?.heartRateCurve as DataPoint[] | undefined

    if (heartRateCurve && heartRateCurve.length > 0) {
      // Courbe FC disponible (import GPX) — calculs précis
      const profile = await this.userProfileRepository.findByUserId(userId)
      if (profile?.maxHeartRate) {
        const hrZones = calculateZones(
          profile.maxHeartRate,
          heartRateCurve,
          profile.restingHeartRate ?? undefined
        )
        runMetrics.hrZones = hrZones
        runMetrics.cardiacDrift = calculateDrift(heartRateCurve)
        runMetrics.trimp = calculateTrimp(input.durationMinutes, hrZones)
      }
    } else if (input.avgHeartRate) {
      // Saisie manuelle — approche mono-zone depuis avgHeartRate
      const profile = await this.userProfileRepository.findByUserId(userId)
      if (profile?.maxHeartRate) {
        const result = buildMonoZoneHrMetrics(
          profile.maxHeartRate,
          profile.restingHeartRate ?? undefined,
          input.avgHeartRate,
          input.durationMinutes
        )
        if (result) Object.assign(runMetrics, result)
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
