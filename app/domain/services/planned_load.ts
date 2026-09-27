import { IntensityZone, SessionType } from '#domain/value_objects/planning_types'
import type { PlannedSession } from '#domain/entities/planned_session'

/**
 * Facteur d'intensité (IF) typique par zone : TSS = heures × IF² × 100
 * (1 h au seuil = 100). Valeurs usuelles des modèles TSS/rTSS.
 */
const INTENSITY_FACTOR: Record<string, number> = {
  [IntensityZone.Z1]: 0.65,
  [IntensityZone.Z2]: 0.75,
  [IntensityZone.Z3]: 0.88,
  [IntensityZone.Z4]: 0.95,
  [IntensityZone.Z5]: 1.05,
}

/** IF équivalent d'un effort perçu (RPE 1 → 10), quand la séance en donne un */
const RPE_FACTOR = [0.5, 0.55, 0.6, 0.65, 0.72, 0.8, 0.87, 0.93, 1.0, 1.05]

/** Renfo et mobilité : peu de charge cardio, quelle que soit la zone indiquée */
const LOW_CARDIO_FACTOR: Partial<Record<string, number>> = {
  [SessionType.Strength]: 0.65,
  [SessionType.Mobility]: 0.5,
}

/** Charge (TSS) attendue d'une séance planifiée */
export function estimatePlannedTss(
  session: Pick<PlannedSession, 'targetDurationMinutes' | 'intensityZone'> &
    Partial<Pick<PlannedSession, 'targetRpe' | 'sessionType'>>
): number {
  if (session.sessionType === SessionType.Rest) return 0
  const factor =
    (session.targetRpe ? RPE_FACTOR[session.targetRpe - 1] : undefined) ??
    (session.sessionType ? LOW_CARDIO_FACTOR[session.sessionType] : undefined) ??
    INTENSITY_FACTOR[session.intensityZone] ??
    0.75
  return Math.round((session.targetDurationMinutes / 60) * factor ** 2 * 100 * 10) / 10
}
