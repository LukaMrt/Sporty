import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { GpxParser } from '#domain/interfaces/gpx_parser'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

@inject()
export default class EnrichSessionWithGpx {
  constructor(
    private sessionRepository: SessionRepository,
    private gpxParser: GpxParser,
    private gpxFileStorage: GpxFileStorage
  ) {}

  async execute(sessionId: number, userId: number, content: Buffer): Promise<TrainingSession> {
    const existing = await this.sessionRepository.findById(sessionId)
    if (!existing) throw new SessionNotFoundError(sessionId)
    if (existing.userId !== userId) throw new SessionForbiddenError()

    const gpx = this.gpxParser.parse(content.toString('utf-8'))
    const gpxFilePath = await this.gpxFileStorage.saveFile(content, userId, sessionId)

    // Courbes et splits GPX ajoutés/écrasés
    const mergedSportMetrics: Record<string, unknown> = {
      ...(existing.sportMetrics ?? {}),
    }
    if (gpx.heartRateCurve !== undefined) mergedSportMetrics.heartRateCurve = gpx.heartRateCurve
    if (gpx.paceCurve !== undefined) mergedSportMetrics.paceCurve = gpx.paceCurve
    if (gpx.altitudeCurve !== undefined) mergedSportMetrics.altitudeCurve = gpx.altitudeCurve
    if (gpx.gpsTrack !== undefined) mergedSportMetrics.gpsTrack = gpx.gpsTrack
    if (gpx.splits !== undefined) mergedSportMetrics.splits = gpx.splits

    // FC min/max, cadence, dénivelé (GPX écrase)
    if (gpx.minHeartRate !== undefined) mergedSportMetrics.minHeartRate = gpx.minHeartRate
    if (gpx.maxHeartRate !== undefined) mergedSportMetrics.maxHeartRate = gpx.maxHeartRate
    if (gpx.cadenceAvg !== undefined) mergedSportMetrics.cadenceAvg = gpx.cadenceAvg
    if (gpx.elevationGain !== undefined) mergedSportMetrics.elevationGain = gpx.elevationGain
    if (gpx.elevationLoss !== undefined) mergedSportMetrics.elevationLoss = gpx.elevationLoss

    return this.sessionRepository.update(sessionId, {
      durationMinutes: Math.round(gpx.durationSeconds / 60),
      distanceKm: Math.round((gpx.distanceMeters / 1000) * 100) / 100,
      avgHeartRate: gpx.avgHeartRate ?? existing.avgHeartRate,
      // date conservée (l'utilisateur peut l'avoir corrigée)
      // perceivedEffort conservé (valeur manuelle)
      // notes conservées (valeur manuelle)
      sportMetrics: mergedSportMetrics,
      gpxFilePath,
    })
  }
}
