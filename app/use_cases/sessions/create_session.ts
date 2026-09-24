import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'
import { GpxParser } from '#domain/interfaces/gpx_parser'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { Logger } from '#domain/interfaces/logger'
import type { TrainingSession } from '#domain/entities/training_session'
import { buildScalarRunMetrics } from '#domain/services/heart_rate_zone_service'
import { deriveSessionFields } from '#domain/services/session_derived_fields'
import { gpxToSportMetrics } from '#domain/services/gpx_metrics'
import { assertHeartRateConsistency } from '#domain/services/session_validation'

export type CreateSessionInput = {
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
  /**
   * Fichier GPX déjà parsé et stocké temporairement. Les courbes sont RELUES
   * depuis ce fichier : on ne fait jamais confiance à celles envoyées par le client.
   */
  gpxTempId?: string | null
}

@inject()
export default class CreateSession {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private sportRepository: SportRepository,
    private loadCalculator: TrainingLoadCalculator,
    private gpxFileStorage: GpxFileStorage,
    private gpxParser: GpxParser,
    private eventEmitter: EventEmitter,
    private logger: Logger
  ) {}

  async execute(userId: number, input: CreateSessionInput): Promise<TrainingSession> {
    assertHeartRateConsistency(input)

    let gpxMetrics: Record<string, unknown> = {}
    if (input.gpxTempId) {
      const content = await this.gpxFileStorage.readTempFile(input.gpxTempId, userId)
      gpxMetrics = gpxToSportMetrics(this.gpxParser.parse(content.toString('utf-8')))
    }

    const [profile, sports] = await Promise.all([
      this.userProfileRepository.findByUserId(userId),
      this.sportRepository.findAll(),
    ])
    const sportSlug = sports.find((s) => s.id === input.sportId)?.slug

    const derived = deriveSessionFields(
      {
        durationMinutes: input.durationMinutes,
        distanceKm: input.distanceKm ?? null,
        avgHeartRate: input.avgHeartRate ?? null,
        perceivedEffort: input.perceivedEffort ?? null,
        // Les valeurs saisies priment sur celles du GPX
        sportMetrics: { ...gpxMetrics, ...buildScalarRunMetrics(input) },
        sportSlug,
      },
      profile,
      this.loadCalculator
    )

    let session = await this.sessionRepository.create({
      userId,
      sportId: input.sportId,
      date: input.date,
      durationMinutes: input.durationMinutes,
      distanceKm: input.distanceKm ?? null,
      avgHeartRate: input.avgHeartRate ?? null,
      perceivedEffort: input.perceivedEffort ?? null,
      sportMetrics: derived.sportMetrics,
      notes: input.notes ?? null,
      gpxFilePath: null,
      trainingLoad: derived.trainingLoad,
      loadMethod: derived.loadMethod,
      analysis: derived.analysis,
      trackPreview: derived.trackPreview,
    })

    if (input.gpxTempId) {
      try {
        const gpxFilePath = await this.gpxFileStorage.moveTempFile(
          input.gpxTempId,
          userId,
          session.id
        )
        session = await this.sessionRepository.update(session.id, { gpxFilePath })
      } catch (error) {
        // La séance est créée avec ses métriques : seul le fichier source manque
        this.logger.warn(
          { err: error, sessionId: session.id, gpxTempId: input.gpxTempId },
          'Failed to move GPX temp file after session creation'
        )
      }
    }

    await this.eventEmitter.emit('session:completed', { sessionId: session.id, userId })
    return session
  }
}
