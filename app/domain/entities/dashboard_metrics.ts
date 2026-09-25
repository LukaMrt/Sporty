export type QuickStatData = {
  /** Volume hebdo en minutes : comparable entre sports, contrairement aux km */
  weeklyDurationMinutes: number
  weeklyDurationTrend: number | null
  weeklyDurationPreviousAvg: number | null
  /** Distance de la semaine par sport (km) */
  weeklyDistanceBySport: Record<string, number>
  avgHeartRate: number | null
  avgHeartRateTrend: number | null
  avgHeartRatePreviousAvg: number | null
  weeklySessionCount: number
  weeklySessionTrend: number | null
  weeklySessionPreviousAvg: number | null
}

/** Allure moyenne de COURSE : l'allure d'un autre sport n'a pas la même unité */
export type HeroMetricData = {
  currentPace: number // min/km
  previousPace: number | null // min/km (null si pas assez de données période précédente)
  trendSeconds: number | null // différence en secondes (négatif = amélioration)
  sparklineData: { date: string; pace: number }[] // 8 dernières séances
}

export type ChartDataPoint = {
  date: string // ISO date
  pace: number | null // min/km, course uniquement (null sinon ou sans distance)
  heartRate: number | null
  distance: number | null // km
}

export type ChartData = {
  points: ChartDataPoint[]
}

export type DashboardMetrics = {
  heroMetric: HeroMetricData | null // null si < 2 séances avec distance
  sessionCount: number
  quickStats: QuickStatData | null // null si < 2 séances totales
  chartData: ChartData | null // null si 0 séances
}
