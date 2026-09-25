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
import { gpxToSportMetrics, mergeGpxIntoImportedMetrics } from '#domain/services/gpx_metrics'
import { daysBetween, todayInTimezone } from '#domain/services/calendar'
import { GpxDateMismatchError } from '#domain/errors/gpx_date_mismatch_error'

/** Écart toléré entre le jour du GPX et celui de la séance (fuseaux horaires) */
const MAX_GPX_DAY_GAP = 1

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

    const profile = await this.userProfileRepository.findByUserId(userId)

    // Un GPX d'un autre jour n'est pas celui de cette séance (±1 j pour les fuseaux)
    if (gpx.startTime) {
      const gpxDate = todayInTimezone(profile?.timezone, new Date(gpx.startTime))
      if (Math.abs(daysBetween(existing.date, gpxDate)) > MAX_GPX_DAY_GAP) {
        throw new GpxDateMismatchError(existing.date, gpxDate)
      }
    }

    const gpxDistanceKm = Math.round((gpx.distanceMeters / 1000) * 100) / 100
    const gpxDurationMinutes = Math.round(gpx.durationSeconds / 60)
    const existingMetrics = (existing.sportMetrics ?? {}) as Record<string, unknown>
    const imported = !!existing.importedFrom

    // Séance importée : la montre fait foi (durée active, FC), le GPX complète.
    // Séance manuelle : le GPX, mesuré, remplace la saisie.
    const sportMetrics = imported
      ? mergeGpxIntoImportedMetrics(existingMetrics, gpxToSportMetrics(gpx))
      : { ...existingMetrics, ...gpxToSportMetrics(gpx) }
    const durationMinutes =
      imported && existing.durationMinutes > 0 ? existing.durationMinutes : gpxDurationMinutes
    const distanceKm = imported && existing.distanceKm ? existing.distanceKm : gpxDistanceKm
    const avgHeartRate = imported
      ? (existing.avgHeartRate ?? gpx.avgHeartRate ?? null)
      : (gpx.avgHeartRate ?? existing.avgHeartRate)

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
        trackPreview: derived.trackPreview,
      })
    } catch (error) {
      // Pas de fichier orphelin si la mise à jour échoue (sauf s'il remplaçait l'ancien)
      if (existing.gpxFilePath !== gpxFilePath) await this.gpxFileStorage.deleteFile(gpxFilePath)
      throw error
    }
  }
}
