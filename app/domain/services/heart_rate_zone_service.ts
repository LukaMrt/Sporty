import type { DataPoint, HeartRateZones } from '#domain/value_objects/run_metrics'

// Limites de zone : [min%, max%] en % FC réserve (Karvonen) ou % FCmax
const ZONE_THRESHOLDS: [number, number][] = [
  [0.5, 0.6], // Z1 — Récupération
  [0.6, 0.7], // Z2 — Endurance
  [0.7, 0.8], // Z3 — Tempo
  [0.8, 0.9], // Z4 — Seuil
  [0.9, 1.0], // Z5 — VMA
]

/**
 * Convertit une FC absolue en FC normalisée [0..1] dans l'espace de la FC réserve
 * (Karvonen) si la FC repos est fournie, sinon en % FCmax simple.
 */
function normalizeHr(hr: number, fcMax: number, fcRest?: number): number {
  if (fcRest !== undefined && fcRest !== null) {
    const reserve = fcMax - fcRest
    return reserve > 0 ? (hr - fcRest) / reserve : 0
  }
  return hr / fcMax
}

/**
 * Retourne le numéro de zone (1–5) pour une FC donnée.
 * Renvoie 0 si en dessous de Z1 (< 50% FCréserve ou FCmax).
 */
export function getZoneForHr(fcMax: number, hr: number, fcRest?: number): number {
  const norm = normalizeHr(hr, fcMax, fcRest)
  for (let i = 0; i < ZONE_THRESHOLDS.length; i++) {
    const [lo, hi] = ZONE_THRESHOLDS[i]
    if (norm >= lo && (norm < hi || i === ZONE_THRESHOLDS.length - 1)) return i + 1
  }
  return 0
}

/**
 * Calcule la répartition temporelle (%) dans chaque zone à partir d'une courbe FC.
 * Chaque DataPoint représente un échantillon à un instant donné (time en secondes).
 * La durée de chaque segment est la distance temporelle jusqu'au point suivant.
 */
export function calculateZones(
  fcMax: number,
  heartRateCurve: DataPoint[],
  fcRest?: number
): HeartRateZones {
  if (heartRateCurve.length === 0) return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }

  const zoneDurations = [0, 0, 0, 0, 0]
  let totalDuration = 0

  for (let i = 0; i < heartRateCurve.length - 1; i++) {
    const segmentDuration = heartRateCurve[i + 1].time - heartRateCurve[i].time
    if (segmentDuration <= 0) continue

    const zone = getZoneForHr(fcMax, heartRateCurve[i].value, fcRest)
    if (zone >= 1 && zone <= 5) zoneDurations[zone - 1] += segmentDuration
    totalDuration += segmentDuration
  }

  if (totalDuration === 0) return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }

  return {
    z1: Math.round((zoneDurations[0] / totalDuration) * 100),
    z2: Math.round((zoneDurations[1] / totalDuration) * 100),
    z3: Math.round((zoneDurations[2] / totalDuration) * 100),
    z4: Math.round((zoneDurations[3] / totalDuration) * 100),
    z5: Math.round((zoneDurations[4] / totalDuration) * 100),
  }
}

/**
 * Retourne les seuils de chaque zone en bpm absolu.
 * Utilise Karvonen si fcRest est fourni, sinon % FCmax simple.
 */
export function getZoneThresholdsBpm(
  fcMax: number,
  fcRest?: number | null
): Array<{ zone: number; minBpm: number; maxBpm: number }> {
  return ZONE_THRESHOLDS.map(([lo, hi], i) => {
    if (fcRest !== undefined && fcRest !== null) {
      const reserve = fcMax - fcRest
      return {
        zone: i + 1,
        minBpm: Math.round(fcRest + lo * reserve),
        maxBpm: Math.round(fcRest + hi * reserve),
      }
    }
    return { zone: i + 1, minBpm: Math.round(lo * fcMax), maxBpm: Math.round(hi * fcMax) }
  })
}

/**
 * Calcule le drift cardiaque (%) en comparant la FC moyenne de la 1ère et 2ème moitié.
 * drift = (FCmoy2 - FCmoy1) / FCmoy1 × 100
 */
export function calculateDrift(heartRateCurve: DataPoint[]): number {
  if (heartRateCurve.length < 2) return 0

  const totalDuration = heartRateCurve[heartRateCurve.length - 1].time - heartRateCurve[0].time
  if (totalDuration <= 0) return 0

  const midTime = heartRateCurve[0].time + totalDuration / 2

  let sum1 = 0
  let count1 = 0
  let sum2 = 0
  let count2 = 0

  for (const point of heartRateCurve) {
    if (point.time <= midTime) {
      sum1 += point.value
      count1++
    } else {
      sum2 += point.value
      count2++
    }
  }

  if (count1 === 0 || count2 === 0) return 0

  const avg1 = sum1 / count1
  const avg2 = sum2 / count2

  return Math.round(((avg2 - avg1) / avg1) * 100 * 10) / 10
}

/**
 * Construit la map de métriques scalaires optionnelles issues d'un formulaire ou d'un GPX
 * (minHeartRate, maxHeartRate, cadenceAvg, elevationGain, elevationLoss).
 * N'inclut que les valeurs définies et non nulles.
 */
export function buildScalarRunMetrics(input: {
  minHeartRate?: number | null
  maxHeartRate?: number | null
  cadenceAvg?: number | null
  elevationGain?: number | null
  elevationLoss?: number | null
}): Record<string, number> {
  const metrics: Record<string, number> = {}
  if (input.minHeartRate !== null && input.minHeartRate !== undefined)
    metrics.minHeartRate = input.minHeartRate
  if (input.maxHeartRate !== null && input.maxHeartRate !== undefined)
    metrics.maxHeartRate = input.maxHeartRate
  if (input.cadenceAvg !== null && input.cadenceAvg !== undefined)
    metrics.cadenceAvg = input.cadenceAvg
  if (input.elevationGain !== null && input.elevationGain !== undefined)
    metrics.elevationGain = input.elevationGain
  if (input.elevationLoss !== null && input.elevationLoss !== undefined)
    metrics.elevationLoss = input.elevationLoss
  return metrics
}

/**
 * Calcule hrZones + TRIMP depuis une FC moyenne unique (saisie manuelle, pas de courbe).
 * Renvoie null si le profil ne permet pas le calcul (pas de FCmax).
 */
export function buildMonoZoneHrMetrics(
  fcMax: number,
  fcRest: number | undefined,
  avgHr: number,
  durationMinutes: number
): { hrZones: HeartRateZones; trimp: number } | null {
  const zone = getZoneForHr(fcMax, avgHr, fcRest)
  if (zone < 1) return null
  const hrZones: HeartRateZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  ;(hrZones as unknown as Record<string, number>)[`z${zone}`] = 100
  return { hrZones, trimp: calculateTrimp(durationMinutes, hrZones) }
}

/**
 * Calcule le TRIMP (Training Impulse) simplifié de Banister.
 * TRIMP = Σ (temps en zone Z_i × coefficient_i)
 * Coefficients : Z1=1, Z2=2, Z3=3, Z4=4, Z5=5
 *
 * Si la courbe FC n'est pas disponible (zones calculées depuis FC moy unique),
 * utilise la zone de la FC moy × durée totale.
 */
export function calculateTrimp(durationMinutes: number, hrZones: HeartRateZones): number {
  const coefficients = [1, 2, 3, 4, 5]
  const zones = [hrZones.z1, hrZones.z2, hrZones.z3, hrZones.z4, hrZones.z5]

  const trimp = zones.reduce((acc, zonePct, i) => {
    return acc + (zonePct / 100) * durationMinutes * coefficients[i]
  }, 0)

  return Math.round(trimp)
}
