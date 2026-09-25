import type { GpxParseResult } from '#domain/interfaces/gpx_parser'

/** Métriques brutes issues d'un GPX (courbes, splits, scalaires) à stocker dans `sportMetrics` */
export function gpxToSportMetrics(gpx: GpxParseResult): Record<string, unknown> {
  const metrics: Record<string, unknown> = {}
  const keys = [
    'heartRateCurve',
    'paceCurve',
    'altitudeCurve',
    'gpsTrack',
    'splits',
    'minHeartRate',
    'maxHeartRate',
    'cadenceAvg',
    'elevationGain',
    'elevationLoss',
  ] as const
  for (const key of keys) {
    if (gpx[key] !== undefined) metrics[key] = gpx[key]
  }
  return metrics
}

/** Métriques qu'un GPX apporte à une séance importée : ce que la montre n'a pas */
const GPX_ONLY_KEYS = [
  'gpsTrack',
  'altitudeCurve',
  'paceCurve',
  'splits',
  'elevationGain',
  'elevationLoss',
] as const

/** Pas des courbes issues d'un GPX (cf. track_analyzer) */
export const GPX_CURVE_STEP_SECONDS = 15
/** Au-delà de cet écart entre deux échantillons, on n'interpole pas (montre décrochée) */
const MAX_INTERPOLATION_GAP_SECONDS = 60

type CurvePoint = { time: number; value: number }

/**
 * Rééchantillonne une courbe sur une grille régulière (0, pas, 2×pas…) par
 * interpolation linéaire. Sans cela, une courbe de montre aux instants
 * irréguliers et les courbes GPX ne partagent presque aucun instant.
 */
export function resampleCurve(curve: CurvePoint[], stepSeconds: number): CurvePoint[] {
  if (curve.length < 2) return curve
  const sorted = [...curve].sort((a, b) => a.time - b.time)
  const out: CurvePoint[] = []
  let i = 0
  for (let t = 0; t <= sorted[sorted.length - 1].time; t += stepSeconds) {
    while (i < sorted.length - 2 && sorted[i + 1].time < t) i++
    const a = sorted[i]
    const b = sorted[i + 1]
    if (t < a.time || t > b.time) continue
    // Échantillon exact : conservé ; sinon interpolation seulement sur un petit trou
    const exact = t === a.time ? a : t === b.time ? b : null
    if (exact) {
      out.push({ time: t, value: exact.value })
      continue
    }
    if (b.time - a.time > MAX_INTERPOLATION_GAP_SECONDS) continue
    const ratio = b.time === a.time ? 0 : (t - a.time) / (b.time - a.time)
    out.push({ time: t, value: Math.round(a.value + (b.value - a.value) * ratio) })
  }
  return out
}

/**
 * Fusion d'un GPX dans une séance IMPORTÉE : la trace, l'altitude, l'allure et
 * les splits viennent du GPX ; courbe FC, FC min/max et cadence de la montre
 * sont conservées et ne sont complétées par le GPX que si elles manquent.
 */
export function mergeGpxIntoImportedMetrics(
  existing: Record<string, unknown>,
  gpxMetrics: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing }
  for (const [key, value] of Object.entries(gpxMetrics)) {
    const gpxOnly = (GPX_ONLY_KEYS as readonly string[]).includes(key)
    if (gpxOnly || merged[key] === undefined || merged[key] === null) merged[key] = value
  }
  // Courbe FC de la montre alignée sur la grille des courbes GPX (allure, altitude)
  const hr = merged.heartRateCurve
  if (Array.isArray(hr) && hr !== gpxMetrics.heartRateCurve) {
    merged.heartRateCurve = resampleCurve(hr as CurvePoint[], GPX_CURVE_STEP_SECONDS)
  }
  return merged
}
