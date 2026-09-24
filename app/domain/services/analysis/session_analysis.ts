import type { DataPoint, GpsPoint } from '#domain/value_objects/run_metrics'
import type { ZoneBoundsBpm } from '#domain/value_objects/heart_rate_zones_config'
import {
  EFFORT_DISTANCES,
  type EffortDistance,
  type SessionAnalysis,
} from '#domain/value_objects/session_analysis'
import { getZoneForBpm } from '#domain/services/heart_rate_zone_bounds'

const EARTH_RADIUS_M = 6_371_000

function haversine(a: GpsPoint, b: GpsPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Distance cumulée (m) à chaque point de la trace */
export function cumulativeDistances(track: GpsPoint[]): number[] {
  const out = [0]
  for (let i = 1; i < track.length; i++) out.push(out[i - 1] + haversine(track[i - 1], track[i]))
  return out
}

/**
 * Meilleur temps (s) pour parcourir `distance` mètres n'importe où dans la séance
 * (fenêtre glissante sur la distance cumulée, interpolation linéaire).
 */
export function bestEffortSeconds(track: GpsPoint[], distance: number): number | null {
  if (track.length < 2) return null
  const cum = cumulativeDistances(track)
  if (cum[cum.length - 1] < distance) return null

  let best = Number.POSITIVE_INFINITY
  let end = 0
  for (let start = 0; start < track.length; start++) {
    const target = cum[start] + distance
    // Tolérance flottante : une fenêtre finissant pile sur le dernier point reste valide
    while (end < track.length && cum[end] < target - 1e-6) end++
    if (end >= track.length) break
    // Instant où la distance cible est atteinte, interpolé entre end-1 et end
    const segment = cum[end] - cum[end - 1]
    const ratio = segment > 0 ? (target - cum[end - 1]) / segment : 0
    const time = track[end - 1].time + ratio * (track[end].time - track[end - 1].time)
    best = Math.min(best, time - track[start].time)
  }

  // Passe symétrique : fenêtre finissant sur un point, départ interpolé
  let begin = track.length - 1
  for (let finish = track.length - 1; finish >= 0; finish--) {
    const target = cum[finish] - distance
    if (target < -1e-6) break
    while (begin > 0 && cum[begin] > target + 1e-6) begin--
    const segment = cum[begin + 1] - cum[begin]
    const ratio = segment > 0 ? (target - cum[begin]) / segment : 0
    const time = track[begin].time + ratio * (track[begin + 1].time - track[begin].time)
    best = Math.min(best, track[finish].time - time)
  }
  return Number.isFinite(best) && best > 0 ? Math.round(best) : null
}

/** Moyenne pondérée par le temps d'une courbe entre deux instants */
function timeWeightedMean(curve: DataPoint[], from: number, to: number): number | null {
  let sum = 0
  let duration = 0
  for (let i = 0; i < curve.length - 1; i++) {
    const a = Math.max(curve[i].time, from)
    const b = Math.min(curve[i + 1].time, to)
    if (b > a) {
      sum += curve[i].value * (b - a)
      duration += b - a
    }
  }
  return duration > 0 ? sum / duration : null
}

/** Percentile p (0–1) des valeurs d'une courbe */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]
}

/**
 * Meilleure FC moyenne sur une fenêtre glissante de `windowSeconds`.
 * La courbe est en escalier (valeur constante jusqu'au point suivant) :
 * intégrale cumulée + deux pointeurs, en O(n).
 */
export function bestWindowMean(curve: DataPoint[], windowSeconds: number): number | null {
  const n = curve.length
  if (n < 2 || curve[n - 1].time - curve[0].time < windowSeconds) return null

  // integral[k] = ∫ FC dt de curve[0].time à curve[k].time
  const integral = [0]
  for (let k = 1; k < n; k++) {
    integral.push(integral[k - 1] + curve[k - 1].value * (curve[k].time - curve[k - 1].time))
  }
  const integralAt = (t: number, k: number) => integral[k] + curve[k].value * (t - curve[k].time)

  let best = -Infinity
  let j = 0
  for (let i = 0; i < n; i++) {
    const end = curve[i].time + windowSeconds
    if (end > curve[n - 1].time) break
    while (j + 1 < n && curve[j + 1].time <= end) j++
    best = Math.max(best, (integralAt(end, j) - integral[i]) / windowSeconds)
  }
  return Number.isFinite(best) ? Math.round(best) : null
}

/**
 * Découplage aérobie Pa:HR : baisse du rapport vitesse/FC entre la 1re et la
 * 2e moitié de la séance. < 5 % sur une sortie longue = bonne base aérobie.
 */
export function aerobicDecoupling(track: GpsPoint[], curve: DataPoint[]): number | null {
  if (track.length < 4 || curve.length < 2) return null
  const cum = cumulativeDistances(track)
  const t0 = track[0].time
  const t1 = track[track.length - 1].time
  const mid = (t0 + t1) / 2
  const midIndex = track.findIndex((p) => p.time >= mid)
  if (midIndex <= 0) return null

  const speed1 = cum[midIndex] / (track[midIndex].time - t0)
  const speed2 = (cum[cum.length - 1] - cum[midIndex]) / (t1 - track[midIndex].time)
  const hr1 = timeWeightedMean(curve, t0, mid)
  const hr2 = timeWeightedMean(curve, mid, t1)
  if (!hr1 || !hr2 || !Number.isFinite(speed1) || !Number.isFinite(speed2)) return null

  const ef1 = speed1 / hr1
  const ef2 = speed2 / hr2
  return Math.round(((ef1 - ef2) / ef1) * 1000) / 10
}

/**
 * Coût énergétique relatif de la course selon la pente (Minetti et al., 2002),
 * normalisé à 1 sur le plat. Pente bornée à ±45 % (domaine de validité).
 */
export function minettiCostFactor(grade: number): number {
  const i = Math.max(-0.45, Math.min(0.45, grade))
  const cost = 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6
  return cost / 3.6
}

/**
 * C5 · Allure ajustée à la pente (GAP) : allure équivalente sur le plat.
 * Chaque segment de ≥ 20 m voit son temps pondéré par le coût de sa pente.
 */
export function gradeAdjustedPace(track: GpsPoint[]): number | null {
  if (track.length < 2 || track.some((p) => p.ele === undefined)) return null
  let distance = 0
  let equivalentTime = 0
  let segStart = 0
  let segDistance = 0
  for (let i = 1; i < track.length; i++) {
    segDistance += haversine(track[i - 1], track[i])
    if (segDistance < 20 && i < track.length - 1) continue
    const dt = track[i].time - track[segStart].time
    const grade = segDistance > 0 ? (track[i].ele! - track[segStart].ele!) / segDistance : 0
    // Même effort sur le plat : on parcourt « coût » fois plus de distance
    distance += segDistance * minettiCostFactor(grade)
    equivalentTime += dt
    segStart = i
    segDistance = 0
  }
  return distance > 0 ? Math.round((equivalentTime / distance) * 1000) : null
}

export interface SessionAnalysisInput {
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  isRunning: boolean
  gpsTrack?: GpsPoint[]
  heartRateCurve?: DataPoint[]
  hrZonesPercent?: { z1: number; z2: number; z3: number; z4: number; z5: number }
}

/** Calcule tous les indicateurs d'une séance à partir de ses données brutes */
export function computeSessionAnalysis(
  input: SessionAnalysisInput,
  bounds: ZoneBoundsBpm | null
): SessionAnalysis {
  const track = input.gpsTrack ?? []
  const curve = input.heartRateCurve ?? []
  const durationSeconds = input.durationMinutes * 60

  const bestEfforts: Partial<Record<EffortDistance, number>> = {}
  if (input.isRunning && track.length >= 2) {
    for (const distance of EFFORT_DISTANCES) {
      const seconds = bestEffortSeconds(track, distance)
      if (seconds !== null) bestEfforts[distance] = seconds
    }
  }

  const speed =
    input.distanceKm && input.durationMinutes > 0
      ? (input.distanceKm * 1000) / input.durationMinutes
      : null
  const efficiencyFactor =
    input.isRunning && speed && input.avgHeartRate
      ? Math.round((speed / input.avgHeartRate) * 1000) / 1000
      : null

  let zoneSeconds: SessionAnalysis['zoneSeconds'] = null
  if (bounds && curve.length >= 2) {
    const secs: [number, number, number, number, number] = [0, 0, 0, 0, 0]
    for (let i = 0; i < curve.length - 1; i++) {
      const zone = getZoneForBpm(bounds, curve[i].value)
      const dt = curve[i + 1].time - curve[i].time
      if (zone >= 1 && dt > 0) secs[zone - 1] += dt
    }
    zoneSeconds = secs
  } else if (input.hrZonesPercent) {
    const z = input.hrZonesPercent
    zoneSeconds = [z.z1, z.z2, z.z3, z.z4, z.z5].map((p) =>
      Math.round((p / 100) * durationSeconds)
    ) as SessionAnalysis['zoneSeconds']
  }

  const easy = bounds !== null && input.avgHeartRate !== null && input.avgHeartRate < bounds[2]

  return {
    bestEfforts,
    efficiencyFactor,
    decoupling: input.isRunning ? aerobicDecoupling(track, curve) : null,
    zoneSeconds,
    observedMaxHr: percentile(
      curve.map((p) => p.value),
      0.99
    ),
    best20MinHr: input.durationMinutes >= 30 ? bestWindowMean(curve, 20 * 60) : null,
    easy,
    gradeAdjustedPace: input.isRunning ? gradeAdjustedPace(track) : null,
  }
}
