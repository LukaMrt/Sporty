import type { TrainingSession } from '#domain/entities/training_session'
import type { UserProfile } from '#domain/entities/user_profile'
import type { SessionLoadInput } from '#domain/value_objects/session_load_input'
import { isRunMetrics } from '#domain/value_objects/sport_metrics'

export const RUNNING_SLUG = 'running'

/**
 * Données de la séance et du profil utilisées pour la charge, par ordre de fiabilité :
 * courbe FC → FC moyenne → allure (course uniquement) + VDOT persisté → effort perçu.
 */
export function buildSessionLoadInput(
  session: Pick<
    TrainingSession,
    'durationMinutes' | 'distanceKm' | 'avgHeartRate' | 'perceivedEffort' | 'sportMetrics'
  > & { sportSlug?: string },
  profile: Pick<
    UserProfile,
    'maxHeartRate' | 'restingHeartRate' | 'sex' | 'vdot' | 'hrZonesConfig'
  > | null
): SessionLoadInput {
  const metrics = session.sportMetrics
  const curve = metrics && isRunMetrics(metrics) ? metrics.heartRateCurve : undefined
  const isRunning = session.sportSlug === undefined || session.sportSlug === RUNNING_SLUG

  return {
    durationHours: session.durationMinutes / 60,
    heartRateCurve: curve && curve.length >= 2 ? curve : undefined,
    avgHeartRate: session.avgHeartRate ?? undefined,
    maxHR: profile?.maxHeartRate ?? undefined,
    restHR: profile?.restingHeartRate ?? undefined,
    sex: profile?.sex ?? undefined,
    lthr: profile?.hrZonesConfig?.lthr ?? undefined,
    avgPaceMPerMin:
      session.distanceKm && session.durationMinutes > 0
        ? (session.distanceKm * 1000) / session.durationMinutes
        : undefined,
    vdot: profile?.vdot ?? undefined,
    isRunning,
    perceivedEffort: session.perceivedEffort ?? undefined,
  }
}
