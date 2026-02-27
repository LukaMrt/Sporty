export interface QuickStatData {
  weeklyVolumeKm: number
  weeklyVolumeTrend: number | null
  weeklyVolumePreviousAvg: number | null
  avgHeartRate: number | null
  avgHeartRateTrend: number | null
  avgHeartRatePreviousAvg: number | null
  weeklySessionCount: number
  weeklySessionTrend: number | null
  weeklySessionPreviousAvg: number | null
}

export interface HeroMetricData {
  currentPace: number // min/km
  previousPace: number | null // min/km (null si pas assez de données période précédente)
  trendSeconds: number | null // différence en secondes (négatif = amélioration)
  sparklineData: { date: string; pace: number }[] // 8 dernières séances
}

export interface ChartDataPoint {
  date: string // ISO date
  pace: number | null // min/km (null si pas de distance)
  heartRate: number | null
  distance: number | null // km
}

export interface ChartData {
  points: ChartDataPoint[]
}

export interface DashboardMetrics {
  heroMetric: HeroMetricData | null // null si < 2 séances avec distance
  sessionCount: number
  quickStats: QuickStatData | null // null si < 2 séances totales
  chartData: ChartData | null // null si 0 séances
}
