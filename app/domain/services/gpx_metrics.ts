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
