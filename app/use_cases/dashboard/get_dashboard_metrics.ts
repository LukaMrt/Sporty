import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type {
  ChartData,
  ChartDataPoint,
  DashboardMetrics,
  HeroMetricData,
  QuickStatData,
} from '#domain/entities/dashboard_metrics'
import type { TrainingSession } from '#domain/entities/training_session'

@inject()
export default class GetDashboardMetrics {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(userId: number, now: Date = new Date()): Promise<DashboardMetrics> {
    const currentEnd = this.#toISODate(now)
    const currentStart = this.#toISODate(this.#weeksAgo(now, 4))
    const previousStart = this.#toISODate(this.#weeksAgo(now, 8))
    const previousEnd = this.#toISODate(this.#weeksAgo(now, 4, -1))

    // Semaine ISO courante (lundi = début)
    const weekStart = this.#toISODate(this.#isoWeekStart(now))
    // Semaine ISO rolling 4 sem pour la FC — partir du lundi de la semaine d'il y a 4 sem.
    // pour avoir les données complètes de chaque semaine (le lundi peut être jusqu'à 6j avant weeksAgo)
    const heartRateStart = this.#toISODate(this.#isoWeekStart(this.#weeksAgo(now, 4)))

    const [currentSessions, previousSessions, weeklySessions, heartRateSessions, allSessionsPage] =
      await Promise.all([
        this.sessionRepository.findByUserIdAndDateRange(userId, currentStart, currentEnd),
        this.sessionRepository.findByUserIdAndDateRange(userId, previousStart, previousEnd),
        this.sessionRepository.findByUserIdAndDateRange(userId, weekStart, currentEnd),
        this.sessionRepository.findByUserIdAndDateRange(userId, heartRateStart, currentEnd),
        this.sessionRepository.findAllByUserId(userId, {
          perPage: 10000,
          sortBy: 'date',
          sortOrder: 'asc',
        }),
      ])

    const sessionCount = allSessionsPage.meta.total
    const allSessions = allSessionsPage.data

    const currentWithDistance = currentSessions.filter((s) => s.distanceKm && s.distanceKm > 0)

    // QuickStats: null si < 2 séances totales
    const quickStats: QuickStatData | null =
      sessionCount < 2 ? null : this.#computeQuickStats(now, weeklySessions, heartRateSessions)

    // ChartData: null si 0 séances
    const chartData: ChartData | null =
      sessionCount === 0 ? null : { points: this.#computeChartPoints(allSessions) }

    if (currentWithDistance.length < 2) {
      return { heroMetric: null, sessionCount, quickStats, chartData }
    }

    const currentPace = this.#computePace(currentWithDistance)
    const previousWithDistance = previousSessions.filter((s) => s.distanceKm && s.distanceKm > 0)
    const previousPace =
      previousWithDistance.length >= 2 ? this.#computePace(previousWithDistance) : null
    const trendSeconds =
      previousPace !== null ? Math.round((currentPace - previousPace) * 60) : null

    const last8WithDistance = currentWithDistance.slice(-8)
    const sparklineData = last8WithDistance.map((s) => ({
      date: s.date,
      pace: Number(s.durationMinutes) / Number(s.distanceKm!),
    }))

    const heroMetric: HeroMetricData = {
      currentPace,
      previousPace,
      trendSeconds,
      sparklineData,
    }

    return { heroMetric, sessionCount, quickStats, chartData }
  }

  #computeQuickStats(
    now: Date,
    weeklySessions: TrainingSession[],
    heartRateSessions: TrainingSession[]
  ): QuickStatData {
    const todayDow = this.#isoDayOfWeek(now) // lundi=1, dimanche=7

    // Volume hebdo
    const weeklyVolumeKm = weeklySessions.reduce((sum, s) => sum + Number(s.distanceKm ?? 0), 0)

    // FC pondérée rolling 4 sem
    const sessionsWithHR = heartRateSessions.filter(
      (s) => s.avgHeartRate !== null && s.durationMinutes > 0
    )
    const avgHeartRate =
      sessionsWithHR.length === 0
        ? null
        : sessionsWithHR.reduce(
            (sum, s) => sum + Number(s.avgHeartRate!) * Number(s.durationMinutes),
            0
          ) / sessionsWithHR.reduce((sum, s) => sum + Number(s.durationMinutes), 0)

    // Nombre de séances cette semaine
    const weeklySessionCount = weeklySessions.length

    // Projection: moyenne des 4 semaines précédentes filtrée au même jour de semaine
    const prev4WeeklyVolumes: number[] = []
    const prev4SessionCounts: number[] = []
    const prev4HRWeighted: { weightedHR: number; totalDuration: number }[] = []

    for (let w = 1; w <= 4; w++) {
      const weekStartDate = this.#isoWeekStart(this.#weeksAgo(now, w))
      const weekStartISO = this.#toISODate(weekStartDate)

      // Jour limite = même jour de semaine dans cette semaine précédente
      const limitDate = new Date(weekStartDate)
      limitDate.setDate(limitDate.getDate() + todayDow - 1)
      const limitISO = this.#toISODate(limitDate)

      const weekSessions = heartRateSessions.filter(
        (s) => s.date >= weekStartISO && s.date <= limitISO
      )

      prev4WeeklyVolumes.push(weekSessions.reduce((sum, s) => sum + Number(s.distanceKm ?? 0), 0))
      prev4SessionCounts.push(weekSessions.length)

      const weekWithHR = weekSessions.filter(
        (s) => s.avgHeartRate !== null && s.durationMinutes > 0
      )
      prev4HRWeighted.push({
        weightedHR: weekWithHR.reduce(
          (sum, s) => sum + Number(s.avgHeartRate!) * Number(s.durationMinutes),
          0
        ),
        totalDuration: weekWithHR.reduce((sum, s) => sum + Number(s.durationMinutes), 0),
      })
    }

    const weeklyVolumePreviousAvg = prev4WeeklyVolumes.reduce((a, b) => a + b, 0) / 4
    const weeklySessionPreviousAvg = prev4SessionCounts.reduce((a, b) => a + b, 0) / 4

    const totalPrevHRWeightedSum = prev4HRWeighted.reduce((sum, w) => sum + w.weightedHR, 0)
    const totalPrevHRDuration = prev4HRWeighted.reduce((sum, w) => sum + w.totalDuration, 0)
    const avgHeartRatePreviousAvg =
      totalPrevHRDuration === 0 ? null : totalPrevHRWeightedSum / totalPrevHRDuration

    return {
      weeklyVolumeKm,
      weeklyVolumeTrend: weeklyVolumeKm - weeklyVolumePreviousAvg,
      weeklyVolumePreviousAvg,
      avgHeartRate,
      avgHeartRateTrend:
        avgHeartRate !== null && avgHeartRatePreviousAvg !== null
          ? avgHeartRate - avgHeartRatePreviousAvg
          : null,
      avgHeartRatePreviousAvg,
      weeklySessionCount,
      weeklySessionTrend: weeklySessionCount - weeklySessionPreviousAvg,
      weeklySessionPreviousAvg,
    }
  }

  #computeChartPoints(sessions: TrainingSession[]): ChartDataPoint[] {
    return sessions.map((s) => {
      const distance = s.distanceKm !== null && s.distanceKm > 0 ? Number(s.distanceKm) : null
      const pace = distance !== null ? Number(s.durationMinutes) / distance : null
      return {
        date: s.date,
        pace,
        heartRate: s.avgHeartRate !== null ? Number(s.avgHeartRate) : null,
        distance,
      }
    })
  }

  #computePace(sessions: TrainingSession[]): number {
    const totalDuration = sessions.reduce((sum, s) => sum + Number(s.durationMinutes), 0)
    const totalDistance = sessions.reduce((sum, s) => sum + Number(s.distanceKm ?? 0), 0)
    return totalDuration / totalDistance
  }

  #isoWeekStart(date: Date): Date {
    const d = new Date(date)
    const dow = d.getDay() // 0=dimanche, 1=lundi...
    const diff = dow === 0 ? -6 : 1 - dow // offset pour revenir au lundi
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  #isoDayOfWeek(date: Date): number {
    const dow = date.getDay()
    return dow === 0 ? 7 : dow // lundi=1, dimanche=7
  }

  #weeksAgo(from: Date, weeks: number, offsetDays = 0): Date {
    const d = new Date(from)
    d.setDate(d.getDate() - weeks * 7 + offsetDays)
    return d
  }

  #toISODate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}
