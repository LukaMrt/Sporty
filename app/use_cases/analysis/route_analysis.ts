import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import {
  alignByDistance,
  maskPoints,
  sameRoute,
  type DistancePoint,
} from '#domain/services/analysis/route'
import { isRunMetrics } from '#domain/value_objects/sport_metrics'

const ALL_TIME: [string, string] = ['1970-01-01', '2999-12-31']
const MAX_COMPARED = 4

export type ComparedSession = {
  id: number
  date: string
  sportSlug: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  points: DistancePoint[]
}

/**
 * Analyses fondées sur la trace GPS :
 * - F4 parcours récurrents (séances sur le même parcours qu'une séance donnée)
 * - F3 comparaison de séances alignées sur la distance
 * - F2 carte de toutes les traces, zones de confidentialité masquées
 */
@inject()
export default class RouteAnalysis {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async sameRouteSessions(userId: number, sessionId: number) {
    const sessions = await this.sessionRepository.findAnalysisEntries(userId, ...ALL_TIME)
    const reference = sessions.find((s) => s.id === sessionId)
    const signature = reference?.analysis?.route
    if (!reference || !signature) return []
    return sessions
      .filter(
        (s) => s.id !== sessionId && s.analysis?.route && sameRoute(signature, s.analysis.route)
      )
      .map((s) => ({
        id: s.id,
        date: s.date,
        durationMinutes: s.durationMinutes,
        distanceKm: s.distanceKm,
        avgHeartRate: s.avgHeartRate,
      }))
      .reverse()
  }

  async compare(userId: number, ids: number[]): Promise<ComparedSession[]> {
    const sessions = await this.sessionRepository.findByIds(
      [...new Set(ids)].slice(0, MAX_COMPARED)
    )
    if (sessions.some((s) => s.userId !== userId)) throw new SessionForbiddenError()
    if (sessions.length === 0) throw new SessionNotFoundError()
    return sessions
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => {
        const metrics = isRunMetrics(s.sportMetrics) ? s.sportMetrics : {}
        return {
          id: s.id,
          date: s.date,
          sportSlug: s.sportSlug ?? 'running',
          durationMinutes: s.durationMinutes,
          distanceKm: s.distanceKm,
          avgHeartRate: s.avgHeartRate,
          points: alignByDistance(metrics.gpsTrack ?? [], metrics.heartRateCurve ?? []),
        }
      })
  }

  async heatmap(userId: number) {
    const [profile, previews] = await Promise.all([
      this.userProfileRepository.findByUserId(userId),
      this.sessionRepository.findTrackPreviews(userId),
    ])
    const zones = profile?.privacyZones ?? []
    return previews.map((p) => ({
      ...p,
      track: maskPoints(
        p.track.map(([lat, lon]) => ({ lat, lon })),
        zones
      ).map((pt) => [pt.lat, pt.lon] as [number, number]),
    }))
  }
}
