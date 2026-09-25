export type SwimMetrics = {
  subType?: string | null
  poolLengthM?: number | null
  laps?: number | null
  strokes?: number | null
  swolf?: number | null
  heartRateCurveDiscarded?: boolean
}

/** Longueurs nagées : fournies par la montre, sinon déduites distance / bassin */
export function swimLaps(metrics: SwimMetrics, distanceKm: number | null): number | null {
  if (metrics.laps) return metrics.laps
  if (metrics.subType !== 'pool' || !metrics.poolLengthM || !distanceKm) return null
  return Math.round((distanceKm * 1000) / metrics.poolLengthM)
}
