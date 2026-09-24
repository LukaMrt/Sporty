import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { GpxParser } from '#domain/interfaces/gpx_parser'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import { deriveSessionFields } from '#domain/services/session_derived_fields'
import { gpxToSportMetrics } from '#domain/services/gpx_metrics'

@inject()
export default class EnrichSessionWithGpx {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private gpxParser: GpxParser,
    private gpxFileStorage: GpxFileStorage,
    private loadCalculator: TrainingLoadCalculator
  ) {}

  async execute(sessionId: number, userId: number, content: Buffer): Promise<TrainingSession> {
    const existing = await this.sessionRepository.findById(sessionId)
    if (!existing) throw new SessionNotFoundError(sessionId)
    if (existing.userId !== userId) throw new SessionForbiddenError()

    // Parse AVANT toute écriture : un GPX invalide ne laisse aucun fichier
    const gpx = this.gpxParser.parse(content.toString('utf-8'))

    // Courbes, splits et scalaires du GPX écrasent les valeurs existantes
    const sportMetrics = { ...(existing.sportMetrics ?? {}), ...gpxToSportMetrics(gpx) }
    const durationMinutes = Math.round(gpx.durationSeconds / 60)
    const distanceKm = Math.round((gpx.distanceMeters / 1000) * 100) / 100
    const avgHeartRate = gpx.avgHeartRate ?? existing.avgHeartRate

    const profile = await this.userProfileRepository.findByUserId(userId)
    const derived = deriveSessionFields(
      {
        durationMinutes,
        distanceKm,
        avgHeartRate,
        perceivedEffort: existing.perceivedEffort,
        sportMetrics,
        sportSlug: existing.sportSlug,
      },
      profile,
      this.loadCalculator
    )

    const gpxFilePath = await this.gpxFileStorage.saveFile(content, userId, sessionId)
    try {
      return await this.sessionRepository.update(sessionId, {
        durationMinutes,
        distanceKm,
        avgHeartRate,
        // date, effort perçu et notes conservés (valeurs manuelles)
        sportMetrics: derived.sportMetrics,
        gpxFilePath,
        trainingLoad: derived.trainingLoad,
        loadMethod: derived.loadMethod,
        analysis: derived.analysis,
      })
    } catch (error) {
      // Pas de fichier orphelin si la mise à jour échoue (sauf s'il remplaçait l'ancien)
      if (existing.gpxFilePath !== gpxFilePath) await this.gpxFileStorage.deleteFile(gpxFilePath)
      throw error
    }
  }
}
