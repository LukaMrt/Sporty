import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetTodayOverview from '#use_cases/dashboard/get_today_overview'
import GetNextSession from '#use_cases/planning/get_next_session'

@inject()
export default class DashboardController {
  constructor(
    private getTodayOverview: GetTodayOverview,
    private getNextSession: GetNextSession
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const userId = auth.user!.id
    const [overview, nextSession] = await Promise.all([
      this.getTodayOverview.execute(userId),
      this.getNextSession.execute(userId),
    ])
    return inertia.render('Dashboard', { overview, nextSession })
  }
}
