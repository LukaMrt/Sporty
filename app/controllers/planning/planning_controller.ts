import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GeneratePlan from '#use_cases/planning/generate_plan'
import { generatePlanValidator } from '#validators/planning/generate_plan_validator'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'
import { NoActiveGoalError } from '#domain/errors/no_active_goal_error'

@inject()
export default class PlanningController {
  constructor(private generatePlanUseCase: GeneratePlan) {}

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

      return response.redirect().toPath('/planning')
    } catch (error) {
      if (error instanceof NoActiveGoalError || error instanceof ActivePlanExistsError) {
        session.flash('error', error.message)
        return response.redirect().back()
      }
      throw error
    }
  }
}
