export interface DataPoint {
  time: number
  value: number
}

export interface GpsPoint {
  lat: number
  lon: number
  ele?: number
  time: number
}

export interface KmSplit {
  km: number
  paceSeconds: number
  avgHeartRate?: number
  elevationGain?: number
  partial?: boolean
}

export interface HeartRateZones {
  z1: number
  z2: number
  z3: number
  z4: number
  z5: number
}

export interface RunMetrics {
  // Métriques de base enrichies (saisie manuelle ou GPX)
  minHeartRate?: number
  maxHeartRate?: number
  cadenceAvg?: number
  elevationGain?: number
  elevationLoss?: number

  // Depuis GPX — données échantillonnées toutes les 15s
  splits?: KmSplit[]
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
  gpsTrack?: GpsPoint[]

  // Calculées
  hrZones?: HeartRateZones
  cardiacDrift?: number
  trimp?: number
  avgPacePerKm?: string
}
