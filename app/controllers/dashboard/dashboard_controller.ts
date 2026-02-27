import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetDashboardMetrics from '#use_cases/dashboard/get_dashboard_metrics'

@inject()
export default class DashboardController {
  constructor(private getDashboardMetrics: GetDashboardMetrics) {}

  async index({ inertia, auth }: HttpContext) {
    const userId = auth.user!.id
    const dashboardMetrics = await this.getDashboardMetrics.execute(userId)

    return inertia.render('Dashboard', {
      heroMetric: dashboardMetrics.heroMetric,
      sessionCount: dashboardMetrics.sessionCount,
      quickStats: dashboardMetrics.quickStats,
      chartData: dashboardMetrics.chartData,
    })
  }
}
