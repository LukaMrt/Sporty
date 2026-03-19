import type { DataPoint, GpsPoint, KmSplit } from '#domain/value_objects/run_metrics'

export interface GpxParseResult {
  // Durée et distance
  durationSeconds: number
  distanceMeters: number

  // Date/heure de début (ISO 8601)
  startTime?: string

  // Métriques FC
  minHeartRate?: number
  avgHeartRate?: number
  maxHeartRate?: number

  // Cadence
  cadenceAvg?: number

  // Dénivelé
  elevationGain?: number
  elevationLoss?: number

  // Courbes échantillonnées toutes les 15s
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
  gpsTrack?: GpsPoint[]

  // Splits au km
  splits?: KmSplit[]
}

export abstract class GpxParser {
  abstract parse(content: string): GpxParseResult
}
