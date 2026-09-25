import { newSwimRecords, swimRecords } from '#domain/services/analysis/swimming'
import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import {
  bestEfforts,
  efficiencyTrend,
  intensityByWeek,
  weekStart,
} from '#domain/services/analysis/aggregations'
import { newRecords, periodTotals } from '#domain/services/analysis/report'

export type ReportPeriod = 'week' | 'month'

function monthBounds(date: string): [string, string] {
  const start = `${date.slice(0, 7)}-01`
  const next = new Date(`${start}T00:00:00Z`)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return [start, addDaysIso(next.toISOString().slice(0, 10), -1)]
}

/** H2 · Bilan d'une semaine ou d'un mois, comparé à la période précédente */
@inject()
export default class GetPeriodReport {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(userId: number, period: ReportPeriod, date?: string) {
    const profile = await this.userProfileRepository.findByUserId(userId)
    const ref = date ?? todayInTimezone(profile?.timezone)
    const [from, to] =
      period === 'week' ? [weekStart(ref), addDaysIso(weekStart(ref), 6)] : monthBounds(ref)
    const [prevFrom, prevTo] =
      period === 'week'
        ? [addDaysIso(from, -7), addDaysIso(from, -1)]
        : monthBounds(addDaysIso(from, -1))

    const [current, previous, history] = await Promise.all([
      this.sessionRepository.findAnalysisEntries(userId, from, to),
      this.sessionRepository.findAnalysisEntries(userId, prevFrom, prevTo),
      this.sessionRepository.findAnalysisEntries(userId, '1970-01-01', addDaysIso(from, -1)),
    ])

    const weeks = new Map<string, number>()
    for (const s of current) {
      const key = weekStart(s.date)
      weeks.set(key, (weeks.get(key) ?? 0) + (s.trainingLoad ?? 0))
    }
    const busiest = [...weeks.entries()].sort((a, b) => b[1] - a[1])[0] ?? null
    // Plus longue sortie : en durée, comparable entre sports (1 km de nage ≠ 1 km de course)
    const longest = [...current].sort((a, b) => b.durationMinutes - a.durationMinutes)[0]
    const intensity = intensityByWeek(current)
    const zoneTotals = intensity.reduce(
      (acc, w) => acc.map((v, i) => v + w.zoneMinutes[i]),
      [0, 0, 0, 0, 0]
    )
    const zoneSum = zoneTotals.reduce((a, b) => a + b, 0)

    return {
      period,
      from,
      to,
      previousDate: prevFrom,
      nextDate: addDaysIso(to, 1),
      totals: periodTotals(current),
      previousTotals: periodTotals(previous),
      records: newRecords(bestEfforts(current), bestEfforts(history)),
      busiestWeek: busiest ? { week: busiest[0], load: Math.round(busiest[1]) } : null,
      longest: longest
        ? {
            id: longest.id,
            date: longest.date,
            sportSlug: longest.sportSlug,
            durationMinutes: longest.durationMinutes,
            distanceKm: longest.distanceKm,
          }
        : null,
      swimRecords: newSwimRecords(swimRecords(current), swimRecords(history)),
      lowIntensityShare:
        zoneSum > 0 ? Math.round(((zoneTotals[0] + zoneTotals[1]) / zoneSum) * 100) : null,
      efficiency: efficiencyTrend([...previous, ...current]),
    }
  }
}
