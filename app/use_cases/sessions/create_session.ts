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
}

@inject()
export default class CreateSession {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(userId: number, input: CreateSessionInput): Promise<TrainingSession> {
    return this.sessionRepository.create({
      userId,
      sportId: input.sportId,
      date: input.date,
      durationMinutes: input.durationMinutes,
      distanceKm: input.distanceKm ?? null,
      avgHeartRate: input.avgHeartRate ?? null,
      perceivedEffort: input.perceivedEffort ?? null,
      sportMetrics: input.sportMetrics ?? {},
      notes: input.notes ?? null,
    })
  }
}
