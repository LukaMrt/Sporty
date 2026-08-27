import type { RawOwTimeSeriesSample } from '#connectors/open_wearables/types'
import type { DataPoint } from '#domain/value_objects/run_metrics'

const MIN_PLAUSIBLE_BPM = 25
const MAX_PLAUSIBLE_BPM = 250
/** Tolerance apres la fin annoncee : les montres continuent un peu d'echantillonner. */
const TRAILING_TOLERANCE_SECONDS = 60

/**
 * Convertit les echantillons de frequence cardiaque en courbe exploitable par
 * `heart_rate_zone_service` (zones, derive cardiaque, TRIMP).
 *
 * `time` est exprime en secondes ecoulees depuis le debut de la seance, comme
 * pour les streams Strava.
 */
export function toHeartRateCurve(
  samples: RawOwTimeSeriesSample[],
  workoutStartTime: string,
  durationSeconds?: number
): DataPoint[] {
  const startMs = new Date(workoutStartTime).getTime()
  if (Number.isNaN(startMs)) return []

  const maxTime =
    durationSeconds !== undefined ? durationSeconds + TRAILING_TOLERANCE_SECONDS : undefined

  const seen = new Set<number>()
  const points: DataPoint[] = []

  for (const sample of samples) {
    if (sample.type !== 'heart_rate') continue
    if (sample.value < MIN_PLAUSIBLE_BPM || sample.value > MAX_PLAUSIBLE_BPM) continue

    const ms = new Date(sample.timestamp).getTime()
    if (Number.isNaN(ms)) continue

    const time = Math.round((ms - startMs) / 1000)
    if (time < 0) continue
    if (maxTime !== undefined && time > maxTime) continue
    if (seen.has(time)) continue

    seen.add(time)
    points.push({ time, value: Math.round(sample.value) })
  }

  if (points.length < 2) return []

  points.sort((a, b) => a.time - b.time)
  return points
}
