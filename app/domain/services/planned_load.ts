import { IntensityZone } from '#domain/value_objects/planning_types'
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

/** Charge (TSS) attendue d'une séance planifiée */
export function estimatePlannedTss(
  session: Pick<PlannedSession, 'targetDurationMinutes' | 'intensityZone'>
): number {
  const factor = INTENSITY_FACTOR[session.intensityZone] ?? 0.75
  return Math.round((session.targetDurationMinutes / 60) * factor ** 2 * 100 * 10) / 10
}
