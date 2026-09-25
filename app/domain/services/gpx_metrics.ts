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
  return merged
}
