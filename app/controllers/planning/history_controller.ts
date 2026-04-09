import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetPlanHistory from '#use_cases/planning/get_plan_history'

@inject()
export default class HistoryController {
  constructor(private getPlanHistoryUseCase: GetPlanHistory) {}

  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const history = await this.getPlanHistoryUseCase.execute(user.id)
    return inertia.render('Planning/History', { history })
  }

  async show({ params, inertia, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const history = await this.getPlanHistoryUseCase.execute(user.id)
    const entry = history.find((e) => e.plan.id === Number(params.id))

    if (!entry) return response.notFound({ error: 'Plan not found' })

    const sessionsByWeek: Record<number, typeof entry.sessions> = {}
    for (const session of entry.sessions) {
      if (!sessionsByWeek[session.weekNumber]) sessionsByWeek[session.weekNumber] = []
      sessionsByWeek[session.weekNumber].push(session)
    }

    return inertia.render('Planning/HistoryDetail', {
      plan: entry.plan,
      weeks: entry.weeks,
      sessionsByWeek,
      goalDistanceKm: entry.goalDistanceKm,
    })
  }
}
