export interface HeroMetricData {
  currentPace: number // min/km
  previousPace: number | null // min/km (null si pas assez de données période précédente)
  trendSeconds: number | null // différence en secondes (négatif = amélioration)
  sparklineData: { date: string; pace: number }[] // 8 dernières séances
}

export interface DashboardMetrics {
  heroMetric: HeroMetricData | null // null si < 2 séances avec distance
  sessionCount: number
}
