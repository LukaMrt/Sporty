import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

export interface UpdateSessionInput {
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
export default class UpdateSession {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(
    sessionId: number,
    userId: number,
    data: UpdateSessionInput
  ): Promise<TrainingSession> {
    const existing = await this.sessionRepository.findById(sessionId)
    if (!existing) throw new SessionNotFoundError(sessionId)
    if (existing.userId !== userId) throw new SessionForbiddenError()

    return this.sessionRepository.update(sessionId, {
      sportId: data.sportId,
      date: data.date,
      durationMinutes: data.durationMinutes,
      distanceKm: data.distanceKm ?? null,
      avgHeartRate: data.avgHeartRate ?? null,
      perceivedEffort: data.perceivedEffort ?? null,
      sportMetrics: data.sportMetrics ?? {},
      notes: data.notes ?? null,
    })
  }
}
