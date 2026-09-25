import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import {
  bestEfforts,
  dailyLoadCalendar,
  decouplingOfLongRuns,
  efficiencyTrend,
  heartRateAtPace,
  intensityByWeek,
  medianEasyPace,
  monotonyByWeek,
  physiologySuggestion,
  racePredictions,
  vdotFromEfforts,
  vdotHistory,
  volumeByPeriod,
} from '#domain/services/analysis/aggregations'
import {
  hrvBelowBandStreak,
  readinessOf,
  recoveryTrend,
  smoothedWeight,
  weakSignals,
} from '#domain/services/analysis/wellness'
import { swimPaceTrend, swimRecords } from '#domain/services/analysis/swimming'
import { buildClaudeSummary, pearson, sleepVsEfficiency } from '#domain/services/analysis/report'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'

export const ANALYSIS_RANGES = { '3m': 91, '6m': 182, '12m': 365, 'all': 3650 } as const
export type AnalysisRange = keyof typeof ANALYSIS_RANGES

/**
 * Données de la page Analyse (§22) : forme, volume, intensité, performance,
 * efficacité, récupération, calendrier et résumé pour Claude.
 * Tout est calculé depuis les colonnes légères et les indicateurs stockés par
 * séance (`sessions.analysis`) : aucune courbe n'est chargée.
 */
@inject()
export default class GetAnalysis {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private dailyMetricsRepository: DailyMetricsRepository,
    private getFitnessProfile: GetFitnessProfile
  ) {}

  async execute(userId: number, range: AnalysisRange = '6m', referencePace?: number) {
    const profile = await this.userProfileRepository.findByUserId(userId)
    const today = todayInTimezone(profile?.timezone)
    const days = ANALYSIS_RANGES[range]
    const from = addDaysIso(today, -days)

    const [sessions, previousYear, wellness, fitness] = await Promise.all([
      this.sessionRepository.findAnalysisEntries(userId, from, today),
      // Comparaison avec la même période un an plus tôt (B2)
      this.sessionRepository.findAnalysisEntries(
        userId,
        addDaysIso(from, -365),
        addDaysIso(today, -365)
      ),
      this.dailyMetricsRepository.findRange(userId, addDaysIso(from, -60), today),
      this.getFitnessProfile.execute(userId, {
        asOf: today,
        historyDays: days + 90, // amorçage du modèle avant la période affichée
        withSeries: true,
      }),
    ])

    const series = fitness.series.filter((d) => d.date >= from)
    const records = bestEfforts(sessions)
    const recentRecords = bestEfforts(sessions, addDaysIso(today, -90))
    const vdot = vdotFromEfforts(recentRecords)
    const reference = recentRecords.find((r) => r.distance >= 5000) ?? recentRecords.at(-1) ?? null
    const intensity = intensityByWeek(sessions)
    const efficiency = efficiencyTrend(sessions)
    const refPace = referencePace ?? medianEasyPace(sessions)
    const recovery = recoveryTrend(wellness).filter((p) => p.date >= from)
    const readiness = readinessOf(wellness, today, fitness.profile?.trainingStressBalance ?? null)
    const signals = weakSignals(wellness, today)
    const correlations = sleepVsEfficiency(sessions, wellness)
    const physiology = physiologySuggestion(
      sessions.filter((s) => s.date >= addDaysIso(today, -182))
    )

    return {
      range,
      asOf: today,
      hasHeartRate: sessions.some((s) => s.analysis?.zoneSeconds),
      hasWellness: wellness.length > 0,
      fitness: {
        current: fitness.profile,
        series,
        methods: fitness.methods,
        monotony: monotonyByWeek(series),
      },
      volume: {
        weekly: volumeByPeriod(sessions, 'week'),
        monthly: volumeByPeriod(sessions, 'month'),
        previousYearMonthly: volumeByPeriod(previousYear, 'month'),
      },
      intensity,
      performance: {
        records,
        recentRecords,
        vdot,
        vdotHistory: vdotHistory(sessions),
        predictions: racePredictions(vdot, reference),
        profileVdot: profile?.vdot ?? null,
        watchVo2Max: wellness.findLast((d) => d.vo2Max !== null)?.vo2Max ?? null,
      },
      swimming: {
        hasSessions: sessions.some((s) => s.sportSlug === 'swimming'),
        paceTrend: swimPaceTrend(sessions),
        records: swimRecords(sessions),
        recentRecords: swimRecords(sessions, addDaysIso(today, -90)),
        css: profile?.cssPacePer100m ?? null,
      },
      efficiency: {
        trend: efficiency,
        decoupling: decouplingOfLongRuns(sessions),
        referencePace: refPace,
        heartRateAtPace: refPace ? heartRateAtPace(sessions, refPace) : [],
      },
      physiology: {
        ...physiology,
        currentMaxHr: profile?.maxHeartRate ?? null,
        currentLthr: profile?.hrZonesConfig?.lthr ?? null,
      },
      recovery: {
        trend: recovery,
        hrvLowStreak: hrvBelowBandStreak(recovery),
        sleep: wellness.filter((d) => d.date >= from && d.sleepMinutes !== null),
        readiness,
        signals,
        weight: smoothedWeight(wellness.filter((d) => d.date >= from)),
        activity: wellness
          .filter((d) => d.date >= from && (d.steps !== null || d.activeMinutes !== null))
          .map((d) => ({ date: d.date, steps: d.steps, activeMinutes: d.activeMinutes })),
      },
      correlations: {
        sleepVsEfficiency: correlations,
        coefficient: pearson(
          correlations.map((c) => c.sleepMinutes),
          correlations.map((c) => c.ef)
        ),
      },
      calendar: dailyLoadCalendar(fitness.series.filter((d) => d.date >= addDaysIso(today, -365))),
      claudeSummary: buildClaudeSummary({
        asOf: today,
        sessions,
        fitness: fitness.profile,
        intensity,
        records,
        recentRecords,
        vdot,
        efficiency,
        recovery,
        readiness,
        signals,
        wellness,
      }),
    }
  }
}

export type AnalysisData = Awaited<ReturnType<GetAnalysis['execute']>>
