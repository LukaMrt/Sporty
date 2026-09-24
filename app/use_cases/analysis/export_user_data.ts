import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import { WELLNESS_FIELDS } from '#domain/value_objects/daily_wellness'
import { toCsv } from '#domain/services/analysis/report'

const ALL_TIME_FROM = '1970-01-01'
const ALL_TIME_TO = '2999-12-31'

/**
 * Portabilité des données (H4, RGPD) : séances et métriques quotidiennes en
 * CSV, trace GPX d'une séance. Les données de santé ne quittent l'app que
 * vers l'utilisateur lui-même.
 */
@inject()
export default class ExportUserData {
  constructor(
    private sessionRepository: SessionRepository,
    private dailyMetricsRepository: DailyMetricsRepository,
    private gpxFileStorage: GpxFileStorage
  ) {}

  async sessionsCsv(userId: number): Promise<string> {
    const sessions = await this.sessionRepository.findAnalysisEntries(
      userId,
      ALL_TIME_FROM,
      ALL_TIME_TO
    )
    return toCsv(
      [
        'id',
        'date',
        'sport',
        'duration_minutes',
        'distance_km',
        'avg_heart_rate',
        'training_load_tss',
        'efficiency_factor',
        'decoupling_percent',
      ],
      sessions.map((s) => [
        s.id,
        s.date,
        s.sportSlug,
        s.durationMinutes,
        s.distanceKm,
        s.avgHeartRate,
        s.trainingLoad,
        s.analysis?.efficiencyFactor,
        s.analysis?.decoupling,
      ])
    )
  }

  async dailyMetricsCsv(userId: number): Promise<string> {
    const days = await this.dailyMetricsRepository.findRange(userId, ALL_TIME_FROM, ALL_TIME_TO)
    return toCsv(
      ['date', ...WELLNESS_FIELDS],
      days.map((d) => [d.date, ...WELLNESS_FIELDS.map((f) => d[f])])
    )
  }

  async sessionGpx(userId: number, sessionId: number): Promise<Buffer | null> {
    const session = await this.sessionRepository.findById(sessionId)
    if (!session) throw new SessionNotFoundError(sessionId)
    if (session.userId !== userId) throw new SessionForbiddenError()
    if (!session.gpxFilePath) return null
    return this.gpxFileStorage.readFile(session.gpxFilePath)
  }
}
