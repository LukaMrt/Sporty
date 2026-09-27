import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { addDaysIso } from '#domain/services/calendar'
import { currentWeek, type WeekPlanned } from '#domain/services/analysis/overview'
import { dailyAdvice } from '#domain/services/analysis/insights'
import { estimatePlannedTss } from '#domain/services/planned_load'
import { plannedSessionDate } from '#domain/services/planned_session_date'
import { PlanStatus, SessionType } from '#domain/value_objects/planning_types'
import GetAnalysis from '#use_cases/analysis/get_analysis'

/** Nombre de constats affichés sur l'accueil : l'essentiel, pas un rapport */
const DASHBOARD_INSIGHTS = 3

/**
 * Accueil « Aujourd'hui » : comment je vais, ma semaine, mon objectif, ma
 * dernière séance et ce qu'il faut retenir. Réutilise `GetAnalysis` (3 mois)
 * pour que l'accueil et la page Analyse disent toujours la même chose.
 */
@inject()
export default class GetTodayOverview {
  constructor(
    private getAnalysis: GetAnalysis,
    private planRepository: TrainingPlanRepository
  ) {}

  async execute(userId: number) {
    const [analysis, plan] = await Promise.all([
      this.getAnalysis.execute(userId, { range: '3m', compare: 'previous' }),
      this.planRepository.findActiveByUserId(userId),
    ])
    const today = analysis.asOf

    let planned: WeekPlanned[] | null = null
    if (plan && plan.status !== PlanStatus.Completed) {
      const sessions = await this.planRepository.findSessionsByPlanId(plan.id)
      planned = sessions
        .filter((p) => p.sessionType !== SessionType.Rest)
        .map((p) => ({
          date: plannedSessionDate(plan.startDate, p.weekNumber, p.dayOfWeek),
          sessionType: p.sessionType,
          sportSlug: p.sportSlug,
          title: p.title,
          minutes: p.targetDurationMinutes,
          tss: p.targetLoadTss ?? estimatePlannedTss(p),
          intensityZone: p.intensityZone,
          status: p.status,
        }))
    }

    const recent = analysis.recentSessions
    const last = recent.at(-1) ?? null
    // Efficacité de la dernière sortie facile comparée à la moyenne de la période
    const efValues = analysis.efficiency.trend.map((e) => e.ef)
    const efAverage =
      efValues.length > 0 ? efValues.reduce((a, b) => a + b, 0) / efValues.length : null
    const efficiencyVsAverage =
      last?.efficiencyFactor && last.easy && efAverage
        ? Math.round(((last.efficiencyFactor - efAverage) / efAverage) * 1000) / 10
        : null

    const recentRecordsSince = addDaysIso(today, -30)

    return {
      today,
      sessionCount: analysis.coverage.totalSessions,
      form: {
        current: analysis.fitness.current,
        trend: analysis.fitness.series.filter((d) => d.date > addDaysIso(today, -42)),
        delta28: analysis.fitness.delta28,
        readiness: analysis.recovery.readiness,
        /** Score principal de la montre : readiness, sinon récupération, sinon Body Battery */
        watchScore:
          analysis.recovery.latestScores.find((s) =>
            ['readinessScore', 'recoveryScore', 'bodyBattery'].includes(s.field)
          ) ?? null,
        advice: dailyAdvice(
          analysis.fitness.current
            ? Math.round(analysis.fitness.current.trainingStressBalance)
            : null,
          analysis.recovery.readiness.level,
          analysis.recovery.signals
        ),
      },
      week: currentWeek(today, recent, planned),
      goal: analysis.goal,
      lastSession: last ? { ...last, efficiencyVsAverage } : null,
      insights: analysis.insights.slice(0, DASHBOARD_INSIGHTS),
      recentRecords: analysis.highlights.newRecords.filter((r) => r.date >= recentRecordsSince),
    }
  }
}

export type TodayOverview = Awaited<ReturnType<GetTodayOverview['execute']>>
