import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GeneratePlan from '#use_cases/planning/generate_plan'
import GetPlanOverview from '#use_cases/planning/get_plan_overview'
import GetWeekDetail from '#use_cases/planning/get_week_detail'
import { generatePlanValidator } from '#validators/planning/generate_plan_validator'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'
import { NoActiveGoalError } from '#domain/errors/no_active_goal_error'

@inject()
export default class PlanningController {
  constructor(
    private generatePlanUseCase: GeneratePlan,
    private getPlanOverview: GetPlanOverview,
    private getWeekDetail: GetWeekDetail
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const overview = await this.getPlanOverview.execute(user.id)
    return inertia.render('Planning/Index', { overview })
  }

  async weekDetail({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const overview = await this.getPlanOverview.execute(user.id)
    if (!overview) {
      return response.notFound({ error: 'No active plan' })
    }

    const weekNumber = Number(params.weekNumber)
    const detail = await this.getWeekDetail.execute(overview.plan.id, weekNumber)
    if (!detail) {
      return response.notFound({ error: 'Week not found' })
    }

    return response.ok(detail)
  }

  async generate({ request, response, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(generatePlanValidator)

    try {
      await this.generatePlanUseCase.execute({
        userId: user.id,
        vdot: data.vdot,
        sessionsPerWeek: data.sessions_per_week,
        preferredDays: data.preferred_days,
        planDurationWeeks: data.plan_duration_weeks,
      })

      if (request.accepts(['json'])) {
        return response.ok({ ok: true })
      }
      return response.redirect().toPath('/planning')
    } catch (error) {
      if (error instanceof NoActiveGoalError || error instanceof ActivePlanExistsError) {
        if (request.accepts(['json'])) {
          return response.unprocessableEntity({ message: error.message })
        }
        session.flash('error', error.message)
        return response.redirect().back()
      }
      throw error
    }
  }
}
