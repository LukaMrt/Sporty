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

/** Types de séries de dynamique de course exposés par Open Wearables */
export const RUNNING_DYNAMICS_TYPES = {
  running_power: 'power',
  cadence: 'cadence',
  running_stride_length: 'strideLength',
  running_ground_contact_time: 'groundContactTime',
  running_vertical_oscillation: 'verticalOscillation',
} as const

type DynamicsKey = (typeof RUNNING_DYNAMICS_TYPES)[keyof typeof RUNNING_DYNAMICS_TYPES]

export interface RunningDynamics {
  averages: Partial<Record<DynamicsKey, number>>
  /** Courbes rééchantillonnées toutes les 15 s (même pas que les courbes GPX) */
  curves: Partial<Record<DynamicsKey, DataPoint[]>>
}

const RESAMPLE_SECONDS = 15

/**
 * D4 · Dynamique de course pendant la séance : moyennes et courbes allégées.
 * Renvoie null si la montre ne fournit aucune de ces séries.
 */
export function toRunningDynamics(
  samples: RawOwTimeSeriesSample[],
  workoutStartTime: string
): RunningDynamics | null {
  const startMs = new Date(workoutStartTime).getTime()
  if (Number.isNaN(startMs)) return null

  const buckets = new Map<DynamicsKey, Map<number, { sum: number; n: number }>>()
  for (const sample of samples) {
    const key = RUNNING_DYNAMICS_TYPES[sample.type as keyof typeof RUNNING_DYNAMICS_TYPES]
    if (!key || !Number.isFinite(sample.value) || sample.value <= 0) continue
    const time = Math.round((new Date(sample.timestamp).getTime() - startMs) / 1000)
    if (time < 0) continue
    const slot = Math.floor(time / RESAMPLE_SECONDS) * RESAMPLE_SECONDS
    const series = buckets.get(key) ?? new Map<number, { sum: number; n: number }>()
    const acc = series.get(slot) ?? { sum: 0, n: 0 }
    acc.sum += sample.value
    acc.n++
    series.set(slot, acc)
    buckets.set(key, series)
  }
  if (buckets.size === 0) return null

  const result: RunningDynamics = { averages: {}, curves: {} }
  for (const [key, series] of buckets) {
    const curve = [...series.entries()]
      .sort(([a], [b]) => a - b)
      .map(([time, { sum, n }]) => ({ time, value: Math.round((sum / n) * 10) / 10 }))
    result.curves[key] = curve
    result.averages[key] =
      Math.round((curve.reduce((a, p) => a + p.value, 0) / curve.length) * 10) / 10
  }
  return result
}
