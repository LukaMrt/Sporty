import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { DashboardMetrics, HeroMetricData } from '#domain/entities/dashboard_metrics'
import type { TrainingSession } from '#domain/entities/training_session'

@inject()
export default class GetDashboardMetrics {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(userId: number): Promise<DashboardMetrics> {
    const now = new Date()
    const currentEnd = this.#toISODate(now)
    const currentStart = this.#toISODate(this.#weeksAgo(now, 4))
    const previousStart = this.#toISODate(this.#weeksAgo(now, 8))
    const previousEnd = this.#toISODate(this.#weeksAgo(now, 4, -1))

    const [currentSessions, previousSessions, allSessions] = await Promise.all([
      this.sessionRepository.findByUserIdAndDateRange(userId, currentStart, currentEnd),
      this.sessionRepository.findByUserIdAndDateRange(userId, previousStart, previousEnd),
      this.sessionRepository.findAllByUserId(userId, { perPage: 1 }),
    ])

    const sessionCount = allSessions.meta.total

    const currentWithDistance = currentSessions.filter((s) => s.distanceKm && s.distanceKm > 0)

    if (currentWithDistance.length < 2) {
      return { heroMetric: null, sessionCount }
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

    return { heroMetric, sessionCount }
  }

  #computePace(sessions: TrainingSession[]): number {
    const totalDuration = sessions.reduce((sum, s) => sum + Number(s.durationMinutes), 0)
    const totalDistance = sessions.reduce((sum, s) => sum + Number(s.distanceKm ?? 0), 0)
    return totalDuration / totalDistance
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
