import type { DataPoint, HeartRateZones } from '#domain/value_objects/run_metrics'

import type { ZoneBoundsBpm } from '#domain/value_objects/heart_rate_zones_config'
import {
  resolveZoneBounds,
  getZoneForBpm,
  calculateZonesFromBounds,
  boundsToThresholds,
} from '#domain/services/heart_rate_zone_bounds'

/**
 * Bornes de la méthode `auto` (Karvonen si FC repos connue, sinon % FCmax).
 * Adaptateurs historiques : les nouveaux appelants passent par `resolveZoneBounds`
 * avec la configuration de l'athlète.
 */
function autoBounds(fcMax: number, fcRest?: number | null): ZoneBoundsBpm {
  const resolved = resolveZoneBounds(null, {
    maxHeartRate: fcMax,
    restingHeartRate: fcRest ?? null,
  })
  // FCmax fournie : `auto` aboutit toujours sauf physiologie incohérente
  return resolved?.bounds ?? [0, 0, 0, 0, 0, fcMax]
}

/**
 * Retourne le numéro de zone (1–5) pour une FC donnée.
 * Renvoie 0 si en dessous de Z1.
 */
export function getZoneForHr(fcMax: number, hr: number, fcRest?: number): number {
  return getZoneForBpm(autoBounds(fcMax, fcRest), hr)
}

/**
 * Calcule la répartition temporelle (%) dans chaque zone à partir d'une courbe FC.
 */
export function calculateZones(
  fcMax: number,
  heartRateCurve: DataPoint[],
  fcRest?: number
): HeartRateZones {
  return calculateZonesFromBounds(autoBounds(fcMax, fcRest), heartRateCurve)
}

/**
 * Retourne les seuils de chaque zone en bpm absolu (méthode `auto`).
 */
export function getZoneThresholdsBpm(
  fcMax: number,
  fcRest?: number | null
): Array<{ zone: number; minBpm: number; maxBpm: number }> {
  return boundsToThresholds(autoBounds(fcMax, fcRest))
}

/**
 * Métriques FC dérivées d'une séance (zones, dérive, TRIMP) à partir de bornes résolues.
 * Courbe disponible → calcul précis ; sinon FC moyenne → approche mono-zone.
 * Renvoie un objet vide si rien n'est calculable : l'appelant doit alors
 * EFFACER les anciennes valeurs plutôt que de les conserver.
 */
export function computeSessionHrMetrics(
  bounds: ZoneBoundsBpm | null,
  input: { heartRateCurve?: DataPoint[]; avgHeartRate?: number | null; durationMinutes: number }
): { hrZones?: HeartRateZones; cardiacDrift?: number; trimp?: number } {
  if (!bounds) return {}
  if (input.heartRateCurve && input.heartRateCurve.length > 0) {
    const hrZones = calculateZonesFromBounds(bounds, input.heartRateCurve)
    return {
      hrZones,
      cardiacDrift: calculateDrift(input.heartRateCurve),
      trimp: calculateTrimp(input.durationMinutes, hrZones),
    }
  }
  if (input.avgHeartRate) {
    const zone = getZoneForBpm(bounds, input.avgHeartRate)
    if (zone < 1) return {}
    const hrZones: HeartRateZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
    ;(hrZones as unknown as Record<string, number>)[`z${zone}`] = 100
    return { hrZones, trimp: calculateTrimp(input.durationMinutes, hrZones) }
  }
  return {}
}

/** Clés de `sportMetrics` recalculées par `computeSessionHrMetrics` */
export const DERIVED_HR_METRIC_KEYS = ['hrZones', 'cardiacDrift', 'trimp'] as const

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
