import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CreateGoal from '#use_cases/planning/create_goal'
import UpdateGoal from '#use_cases/planning/update_goal'
import AbandonGoal from '#use_cases/planning/abandon_goal'
import { ActiveGoalExistsError } from '#domain/errors/active_goal_exists_error'
import { createGoalValidator, updateGoalValidator } from '#validators/planning/goal_validator'

@inject()
export default class GoalsController {
  constructor(
    private createGoalUseCase: CreateGoal,
    private updateGoalUseCase: UpdateGoal,
    private abandonGoalUseCase: AbandonGoal
  ) {}

  async store({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(createGoalValidator)
    const userId = auth.user!.id

    try {
      const goal = await this.createGoalUseCase.execute({
        userId,
        targetDistanceKm: data.target_distance_km,
        targetTimeMinutes: data.target_time_minutes ?? null,
        eventDate: data.event_date ? data.event_date.toISOString().slice(0, 10) : null,
      })
      return response.json({ goal })
    } catch (error) {
      if (error instanceof ActiveGoalExistsError) {
        return response.unprocessableEntity({ message: error.message })
      }
      throw error
    }
  }

  async update({ request, response, params }: HttpContext) {
    const data = await request.validateUsing(updateGoalValidator)
    const goalId = Number(params.id)

    const goal = await this.updateGoalUseCase.execute({
      goalId,
      targetDistanceKm: data.target_distance_km,
      targetTimeMinutes: data.target_time_minutes,
      eventDate: data.event_date ? data.event_date.toISOString().slice(0, 10) : data.event_date,
    })
    return response.json({ goal })
  }

  async abandon({ response, params, auth }: HttpContext) {
    const goalId = Number(params.id)
    const userId = auth.user!.id

    await this.abandonGoalUseCase.execute(goalId, userId)
    return response.json({ success: true })
  }
}
