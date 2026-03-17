import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'

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
}

@inject()
export default class CreateSession {
  constructor(private sessionRepository: SessionRepository) {}

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
    })
  }
}
