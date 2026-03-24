import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetDashboardMetrics from '#use_cases/dashboard/get_dashboard_metrics'
import GetNextSession from '#use_cases/planning/get_next_session'

@inject()
export default class DashboardController {
  constructor(
    private getDashboardMetrics: GetDashboardMetrics,
    private getNextSession: GetNextSession
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const userId = auth.user!.id
    const [dashboardMetrics, nextSession] = await Promise.all([
      this.getDashboardMetrics.execute(userId),
      this.getNextSession.execute(userId),
    ])

    return inertia.render('Dashboard', {
      heroMetric: dashboardMetrics.heroMetric,
      sessionCount: dashboardMetrics.sessionCount,
      quickStats: dashboardMetrics.quickStats,
      chartData: dashboardMetrics.chartData,
      nextSession,
    })
  }
}
