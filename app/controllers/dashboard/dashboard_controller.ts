import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetDashboardMetrics from '#use_cases/dashboard/get_dashboard_metrics'
import GetNextSession from '#use_cases/planning/get_next_session'
import GetPlanOverview from '#use_cases/planning/get_plan_overview'

@inject()
export default class DashboardController {
  constructor(
    private getDashboardMetrics: GetDashboardMetrics,
    private getNextSession: GetNextSession,
    private getPlanOverview: GetPlanOverview
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const userId = auth.user!.id
    const [dashboardMetrics, nextSession, overview] = await Promise.all([
      this.getDashboardMetrics.execute(userId),
      this.getNextSession.execute(userId),
      this.getPlanOverview.execute(userId),
    ])

    const fp = overview?.fitnessProfile
    return inertia.render('Dashboard', {
      heroMetric: dashboardMetrics.heroMetric,
      sessionCount: dashboardMetrics.sessionCount,
      quickStats: dashboardMetrics.quickStats,
      chartData: dashboardMetrics.chartData,
      nextSession,
      acwr: fp ? Math.round(fp.acuteChronicWorkloadRatio * 100) / 100 : null,
    })
  }
}
