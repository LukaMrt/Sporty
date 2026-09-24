import type { TrainingSession } from '#domain/entities/training_session'
import type { UserProfile } from '#domain/entities/user_profile'
import type { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import type { SportMetrics } from '#domain/value_objects/sport_metrics'
import type { TrainingLoadMethod } from '#domain/value_objects/training_load'
import type { DataPoint } from '#domain/value_objects/run_metrics'
import { isRunMetrics } from '#domain/value_objects/sport_metrics'
import { resolveZoneBounds } from '#domain/services/heart_rate_zone_bounds'
import {
  computeSessionHrMetrics,
  DERIVED_HR_METRIC_KEYS,
} from '#domain/services/heart_rate_zone_service'
import { buildSessionLoadInput } from '#domain/services/session_load'

export type SessionForDerivation = Pick<
  TrainingSession,
  'durationMinutes' | 'distanceKm' | 'avgHeartRate' | 'perceivedEffort' | 'sportMetrics'
> & { sportSlug?: string }

export type ProfileForDerivation = Pick<
  UserProfile,
  'maxHeartRate' | 'restingHeartRate' | 'sex' | 'vdot' | 'hrZonesConfig'
> | null

export interface DerivedSessionFields {
  sportMetrics: SportMetrics
  trainingLoad: number
  loadMethod: TrainingLoadMethod
}

/**
 * Recalcule TOUS les champs dérivés d'une séance à partir de ses données brutes
 * et du profil courant : zones FC, dérive, TRIMP (dans `sportMetrics`) et charge.
 *
 * Les anciennes valeurs dérivées sont systématiquement retirées : si la FC moyenne
 * a été effacée ou la FCmax inconnue, la séance n'affiche plus de zones obsolètes.
 * Les valeurs éventuellement envoyées par le client sont donc ignorées.
 */
export function deriveSessionFields(
  session: SessionForDerivation,
  profile: ProfileForDerivation,
  loadCalculator: TrainingLoadCalculator
): DerivedSessionFields {
  const raw: Record<string, unknown> = { ...(session.sportMetrics ?? {}) }
  for (const key of DERIVED_HR_METRIC_KEYS) delete raw[key]

  const bounds =
    profile?.maxHeartRate || profile?.hrZonesConfig
      ? (resolveZoneBounds(profile.hrZonesConfig ?? null, {
          maxHeartRate: profile.maxHeartRate ?? null,
          restingHeartRate: profile.restingHeartRate ?? null,
        })?.bounds ?? null)
      : null

  const curve = isRunMetrics(raw)
    ? (raw as { heartRateCurve?: DataPoint[] }).heartRateCurve
    : undefined
  const hrMetrics = computeSessionHrMetrics(bounds, {
    heartRateCurve: curve,
    avgHeartRate: session.avgHeartRate,
    durationMinutes: session.durationMinutes,
  })

  const sportMetrics = { ...raw, ...hrMetrics } as SportMetrics
  const load = loadCalculator.calculate(
    buildSessionLoadInput({ ...session, sportMetrics }, profile)
  )

  return { sportMetrics, trainingLoad: load.value, loadMethod: load.method }
}
