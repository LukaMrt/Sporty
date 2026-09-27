import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { addDaysIso, daysBetween, todayInTimezone } from '#domain/services/calendar'
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
  weekStart,
  type AnalysisSession,
} from '#domain/services/analysis/aggregations'
import {
  hrvBelowBandStreak,
  latestWatchScores,
  readinessOf,
  sleepRegularity,
  recoveryTrend,
  smoothedWeight,
  weakSignals,
} from '#domain/services/analysis/wellness'
import { swimPaceTrend, swimRecords } from '#domain/services/analysis/swimming'
import {
  buildClaudeSummary,
  newRecords,
  pearson,
  periodTotals,
  sleepVsEfficiency,
} from '#domain/services/analysis/report'
import {
  acwrSeries,
  comparisonPeriod,
  ctlDelta,
  goalOutlook,
  loadBySportByWeek,
  loadVsHrv,
  periodHighlights,
  planAdherence,
  regularity,
  withEffectiveLoads,
  type CompareMode,
  type PlannedLoad,
} from '#domain/services/analysis/overview'
import { buildInsights } from '#domain/services/analysis/insights'
import { estimatePlannedTss } from '#domain/services/planned_load'
import { plannedSessionDate } from '#domain/services/planned_session_date'
import { PlanStatus, PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'

export const ANALYSIS_RANGES = { '3m': 91, '6m': 182, '12m': 365, 'all': 3650 } as const
export type AnalysisRange = keyof typeof ANALYSIS_RANGES

export type AnalysisQuery = {
  range?: AnalysisRange
  /** Période personnalisée (prioritaire sur `range` si les deux bornes sont fournies) */
  from?: string
  to?: string
  /** Filtre sport (slug) ; la forme, elle, combine toujours tous les sports */
  sport?: string
  compare?: CompareMode
  /** Allure de référence (s/km) pour « FC à allure de référence » */
  pace?: number
}

/** Projection de forme au-delà d'un an : trop incertaine pour être utile */
const MAX_PROJECTION_DAYS = 400

const within = (from: string, to: string) => (s: AnalysisSession) => s.date >= from && s.date <= to

/**
 * Données de la page Analyse (§22) : synthèse, enseignements, forme, volume,
 * intensité, performance, efficacité, récupération, objectif et résumé pour
 * Claude. Tout est calculé depuis les colonnes légères et les indicateurs
 * stockés par séance (`sessions.analysis`) : aucune courbe n'est chargée.
 *
 * Les charges viennent de `GetFitnessProfile` (charge effective, identique à
 * celle du modèle de forme) : bilan, calendrier et résumé restent cohérents.
 */
@inject()
export default class GetAnalysis {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private dailyMetricsRepository: DailyMetricsRepository,
    private goalRepository: TrainingGoalRepository,
    private planRepository: TrainingPlanRepository,
    private getFitnessProfile: GetFitnessProfile
  ) {}

  async execute(userId: number, query: AnalysisQuery = {}) {
    const profile = await this.userProfileRepository.findByUserId(userId)
    const today = todayInTimezone(profile?.timezone)

    const custom = query.from !== undefined && query.to !== undefined
    const range: AnalysisRange | 'custom' = custom ? 'custom' : (query.range ?? '6m')
    const to = custom ? (query.to! < today ? query.to! : today) : today
    const from = custom ? query.from! : addDaysIso(today, -ANALYSIS_RANGES[range as AnalysisRange])
    const compare = query.compare ?? 'previous'
    const comparison = comparisonPeriod(from, to, compare)
    const earliest = comparison && comparison.from < from ? comparison.from : from

    const [history, wellness, goal, plan] = await Promise.all([
      this.sessionRepository.findAnalysisEntries(userId, '1970-01-01', today),
      this.dailyMetricsRepository.findRange(userId, addDaysIso(from, -60), to),
      this.goalRepository.findActiveByUserId(userId),
      this.planRepository.findActiveByUserId(userId),
    ])
    const plannedSessions =
      plan && plan.status !== PlanStatus.Completed
        ? await this.planRepository.findSessionsByPlanId(plan.id)
        : []
    const planned = plan
      ? plannedSessions
          .filter((p) => p.sessionType !== SessionType.Rest)
          .map((p) => ({
            date: plannedSessionDate(plan.startDate, p.weekNumber, p.dayOfWeek),
            minutes: p.targetDurationMinutes,
            tss: p.targetLoadTss ?? estimatePlannedTss(p),
            pending: p.status === PlannedSessionStatus.Pending,
          }))
      : []

    // Projection jusqu'au jour de l'objectif, sinon jusqu'à la fin du plan
    const lastPlanned = planned
      .map((p) => p.date)
      .sort()
      .at(-1)
    const projectionEnd =
      goal?.eventDate && goal.eventDate > today ? goal.eventDate : (lastPlanned ?? null)
    const projectUntil =
      projectionEnd &&
      projectionEnd > today &&
      daysBetween(today, projectionEnd) <= MAX_PROJECTION_DAYS
        ? projectionEnd
        : null

    const fitness = await this.getFitnessProfile.execute(userId, {
      asOf: today,
      historyDays: daysBetween(earliest, today) + 90, // amorçage du modèle avant la période
      withSeries: true,
      projection: projectUntil
        ? {
            until: projectUntil,
            plannedLoads: planned.filter((p) => p.pending && p.date > today),
          }
        : undefined,
    })

    const all = withEffectiveLoads(history, fitness.loads)
    const periodAll = all.filter(within(from, to))
    const sportFilter = (s: AnalysisSession) => !query.sport || s.sportSlug === query.sport
    const sessions = periodAll.filter(sportFilter)
    const comparisonSessions = comparison
      ? all.filter(within(comparison.from, comparison.to)).filter(sportFilter)
      : null
    const previousYear = all
      .filter(within(addDaysIso(from, -365), addDaysIso(to, -365)))
      .filter(sportFilter)

    const series = fitness.series.filter((d) => d.date >= from && d.date <= to)
    const allTimeRecords = bestEfforts(all)
    const periodRecords = bestEfforts(periodAll)
    const recordsBefore = bestEfforts(all.filter((s) => s.date < from))
    const brokenRecords = newRecords(periodRecords, recordsBefore)
    const recentRecords = bestEfforts(all, addDaysIso(today, -90))
    const vdot = vdotFromEfforts(recentRecords)
    const reference = recentRecords.find((r) => r.distance >= 5000) ?? recentRecords.at(-1) ?? null
    const intensity = intensityByWeek(sessions)
    const efficiency = efficiencyTrend(sessions)
    const decoupling = decouplingOfLongRuns(sessions)
    const refPace = query.pace ?? medianEasyPace(sessions)
    const recovery = recoveryTrend(wellness).filter((p) => p.date >= from)
    const readiness = readinessOf(wellness, today, fitness.profile?.trainingStressBalance ?? null)
    const signals = weakSignals(wellness, today)
    const hrvLowStreak = hrvBelowBandStreak(recovery)
    const sleep = sleepRegularity(wellness, today)
    const inPeriod = wellness.filter((d) => d.date >= from)
    const correlations = sleepVsEfficiency(sessions, wellness)
    const physiology = physiologySuggestion(all.filter(within(addDaysIso(today, -182), today)))
    const monotony = monotonyByWeek(series)
    const totals = periodTotals(sessions)
    const comparisonTotals = comparisonSessions ? periodTotals(comparisonSessions) : null
    const reg = regularity(sessions, from, to)
    const vdotTrend = vdotHistory(sessions)
    const swimTrend = swimPaceTrend(sessions)
    const outlook = goal ? goalOutlook({ goal, vdot, today, projection: fitness.projection }) : null
    const adherence = plan
      ? planAdherence(
          planned.map(({ date, minutes, tss }): PlannedLoad => ({ date, minutes, tss })),
          all.filter(within(plan.startDate, today)),
          today
        )
      : []

    const firstSessionByDate = new Map<string, number>()
    for (const s of all) if (!firstSessionByDate.has(s.date)) firstSessionByDate.set(s.date, s.id)

    return {
      range,
      from,
      to,
      asOf: today,
      filters: {
        sport: query.sport ?? null,
        compare,
        comparison,
        /** Sports pratiqués sur la période (pour le filtre) */
        sports: [...new Set(periodAll.map((s) => s.sportSlug))].sort(),
      },
      coverage: {
        sessions: sessions.length,
        totalSessions: all.length,
        hasMaxHr: (profile?.maxHeartRate ?? null) !== null,
        hasHeartRateSessions: sessions.some((s) => s.avgHeartRate !== null),
        hasGps: all.some(
          (s) => s.analysis?.bestEfforts && Object.keys(s.analysis.bestEfforts).length > 0
        ),
        hasGoal: goal !== null,
        hasPlan: plan !== null,
      },
      hasHeartRate: sessions.some((s) => s.analysis?.zoneSeconds),
      hasWellness: wellness.length > 0,
      insights: buildInsights({
        fitness: fitness.profile,
        series: fitness.series,
        monotony,
        totals,
        comparison: comparisonTotals,
        intensity,
        efficiency,
        decoupling,
        newRecords: brokenRecords,
        vdotHistory: vdotTrend,
        readiness,
        hrvLowStreak,
        signals,
        regularity: reg,
        swimPace: swimTrend,
        goal: outlook,
        sleep,
        heartRateRecovery: inPeriod.flatMap((d) =>
          d.heartRateRecovery !== null ? [d.heartRateRecovery] : []
        ),
      }),
      totals: { current: totals, comparison: comparisonTotals },
      highlights: { ...periodHighlights(sessions), newRecords: brokenRecords },
      regularity: reg,
      goal: outlook,
      fitness: {
        current: fitness.profile,
        series,
        methods: fitness.methods,
        monotony,
        acwr: acwrSeries(series),
        ramp7: ctlDelta(fitness.series, 7),
        delta28: ctlDelta(fitness.series, 28),
        projection: fitness.projection,
        loadBySport: loadBySportByWeek(sessions),
        adherence,
      },
      volume: {
        weekly: volumeByPeriod(sessions, 'week'),
        monthly: volumeByPeriod(sessions, 'month'),
        previousYearMonthly: volumeByPeriod(previousYear, 'month'),
      },
      intensity,
      performance: {
        records: allTimeRecords,
        periodRecords,
        recentRecords,
        vdot,
        vdotHistory: vdotTrend,
        predictions: racePredictions(vdot, reference),
        profileVdot: profile?.vdot ?? null,
        watchVo2Max: wellness.findLast((d) => d.vo2Max !== null)?.vo2Max ?? null,
      },
      swimming: {
        hasSessions: sessions.some((s) => s.sportSlug === 'swimming'),
        paceTrend: swimTrend,
        records: swimRecords(sessions),
        recentRecords: swimRecords(sessions, addDaysIso(today, -90)),
        css: profile?.cssPacePer100m ?? null,
      },
      efficiency: {
        trend: efficiency,
        decoupling,
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
        hrvLowStreak,
        sleep: wellness.filter((d) => d.date >= from && d.sleepMinutes !== null),
        readiness,
        signals,
        weight: smoothedWeight(wellness.filter((d) => d.date >= from)),
        activity: wellness
          .filter(
            (d) =>
              d.date >= from &&
              (d.steps !== null || d.activeMinutes !== null || d.activeCaloriesKcal !== null)
          )
          .map((d) => ({
            date: d.date,
            steps: d.steps,
            activeMinutes: d.activeMinutes,
            activeCalories: d.activeCaloriesKcal,
            sedentaryMinutes: d.sedentaryMinutes,
          })),
        loadVsHrv: loadVsHrv(fitness.series, recovery),
        sleepRegularity: sleep,
        sleepSchedule: inPeriod.flatMap((d) =>
          d.sleepBedtimeMinutes !== null && d.sleepWakeMinutes !== null
            ? [{ date: d.date, bedtime: d.sleepBedtimeMinutes, wake: d.sleepWakeMinutes }]
            : []
        ),
        watchScores: inPeriod
          .filter(
            (d) =>
              d.readinessScore !== null ||
              d.recoveryScore !== null ||
              d.bodyBattery !== null ||
              d.stressScore !== null ||
              d.sleepScore !== null
          )
          .map((d) => ({
            date: d.date,
            readiness: d.readinessScore,
            recovery: d.recoveryScore,
            bodyBattery: d.bodyBattery,
            stress: d.stressScore,
            sleep: d.sleepScore,
            strain: d.strainScore,
          })),
        latestScores: latestWatchScores(wellness, today),
        heartRateRecovery: inPeriod.flatMap((d) =>
          d.heartRateRecovery !== null ? [{ date: d.date, hrr: d.heartRateRecovery }] : []
        ),
      },
      correlations: {
        sleepVsEfficiency: correlations,
        coefficient: pearson(
          correlations.map((c) => c.sleepMinutes),
          correlations.map((c) => c.ef)
        ),
      },
      /** Séances de la semaine en cours et des 4 précédentes, tous sports (dashboard) */
      recentSessions: all.filter(within(addDaysIso(weekStart(today), -28), today)).map((s) => ({
        id: s.id,
        date: s.date,
        sportSlug: s.sportSlug,
        durationMinutes: s.durationMinutes,
        distanceKm: s.distanceKm,
        avgHeartRate: s.avgHeartRate,
        trainingLoad: s.trainingLoad,
        efficiencyFactor: s.analysis?.efficiencyFactor ?? null,
        easy: s.analysis?.easy ?? false,
      })),
      // Chaque jour chargé pointe vers sa (première) séance
      calendar: dailyLoadCalendar(
        fitness.series.filter((d) => d.date >= addDaysIso(today, -365))
      ).map((d) => ({ ...d, sessionId: firstSessionByDate.get(d.date) ?? null })),
      claudeSummary: buildClaudeSummary({
        asOf: today,
        sessions: all.filter(within(addDaysIso(today, -7), today)),
        fitness: fitness.profile,
        intensity: intensityByWeek(all.filter(within(addDaysIso(today, -28), today))),
        records: allTimeRecords,
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
