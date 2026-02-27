import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetDashboardMetrics from '#use_cases/dashboard/get_dashboard_metrics'
import GetProfile from '#use_cases/profile/get_profile'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'

@inject()
export default class DashboardController {
  constructor(
    private getDashboardMetrics: GetDashboardMetrics,
    private getProfile: GetProfile
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const userId = auth.user!.id
    const [dashboardMetrics, profile] = await Promise.all([
      this.getDashboardMetrics.execute(userId),
      this.getProfile.execute(userId),
    ])
    const speedUnit = profile?.preferences.speedUnit ?? DEFAULT_USER_PREFERENCES.speedUnit

    return inertia.render('Dashboard', {
      heroMetric: dashboardMetrics.heroMetric,
      sessionCount: dashboardMetrics.sessionCount,
      speedUnit,
    })
  }
}
