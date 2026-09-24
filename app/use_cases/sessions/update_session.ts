import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import { deriveSessionFields } from '#domain/services/session_derived_fields'
import { assertHeartRateConsistency } from '#domain/services/session_validation'

export interface UpdateSessionInput {
  sportId: number
  date: string
  durationMinutes: number
  distanceKm?: number | null
  avgHeartRate?: number | null
  perceivedEffort?: number | null
  notes?: string | null
  minHeartRate?: number | null
  maxHeartRate?: number | null
  cadenceAvg?: number | null
  elevationGain?: number | null
  elevationLoss?: number | null
}

/** Métriques scalaires éditables dans le formulaire (null = effacée) */
const EDITABLE_SCALARS = [
  'minHeartRate',
  'maxHeartRate',
  'cadenceAvg',
  'elevationGain',
  'elevationLoss',
] as const

@inject()
export default class UpdateSession {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private sportRepository: SportRepository,
    private loadCalculator: TrainingLoadCalculator
  ) {}

  async execute(
    sessionId: number,
    userId: number,
    data: UpdateSessionInput
  ): Promise<TrainingSession> {
    const existing = await this.sessionRepository.findById(sessionId)
    if (!existing) throw new SessionNotFoundError(sessionId)
    if (existing.userId !== userId) throw new SessionForbiddenError()
    assertHeartRateConsistency(data)

    // Fusion avec les métriques existantes : courbes, trace GPS et splits ne
    // transitent plus par le client (payload léger, pas d'altération possible).
    const sportMetrics: Record<string, unknown> = { ...(existing.sportMetrics ?? {}) }
    for (const key of EDITABLE_SCALARS) {
      const value = data[key]
      if (value === null) delete sportMetrics[key]
      else if (value !== undefined) sportMetrics[key] = value
    }

    const [profile, sports] = await Promise.all([
      this.userProfileRepository.findByUserId(userId),
      this.sportRepository.findAll(),
    ])
    const derived = deriveSessionFields(
      {
        durationMinutes: data.durationMinutes,
        distanceKm: data.distanceKm ?? null,
        avgHeartRate: data.avgHeartRate ?? null,
        perceivedEffort: data.perceivedEffort ?? null,
        sportMetrics,
        sportSlug: sports.find((s) => s.id === data.sportId)?.slug,
      },
      profile,
      this.loadCalculator
    )

    return this.sessionRepository.update(sessionId, {
      sportId: data.sportId,
      date: data.date,
      durationMinutes: data.durationMinutes,
      distanceKm: data.distanceKm ?? null,
      avgHeartRate: data.avgHeartRate ?? null,
      perceivedEffort: data.perceivedEffort ?? null,
      sportMetrics: derived.sportMetrics,
      notes: data.notes ?? null,
      trainingLoad: derived.trainingLoad,
      loadMethod: derived.loadMethod,
      analysis: derived.analysis,
    })
  }
}
